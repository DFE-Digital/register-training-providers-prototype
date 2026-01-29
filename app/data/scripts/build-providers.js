#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

/**
 * Columns expected in source CSVs.
 * @type {string[]}
 */
const EXPECTED_FIELDS = [
  "operating_name",
  "legal_name",
  "ukprn",
  "urn",
  "provider_code",
  "accredited_provider_number",
  "provider_type",
  "address1",
  "address2",
  "address3",
  "address4",
  "town",
  "postcode",
  "latitude",
  "longitude",
  "academic_year_code",
];

/**
 * Columns emitted in providers.csv (ordered).
 * @type {string[]}
 */
const OUTPUT_FIELDS = [
  "provider__operating_name",
  "provider__legal_name",
  "provider__ukprn",
  "provider__urn",
  "provider__code",
  "provider__accreditation_status",
  "accreditation__number",
  "accreditation__start_date",
  "accreditation__end_date",
  "provider__provider_type",
  "address__address_line_1",
  "address__address_line_2",
  "address__address_line_3",
  "address__town_or_city",
  "address__county",
  "address__postcode",
  "address__latitude",
  "address__longitude",
  "provider__academic_years_active",
  "provider__academic_year_code",
];

/**
 * Mapping of source columns to output columns.
 * @type {Record<string, string>}
 */
const OUTPUT_MAP = {
  operating_name: "provider__operating_name",
  legal_name: "provider__legal_name",
  ukprn: "provider__ukprn",
  urn: "provider__urn",
  provider_code: "provider__code",
  accredited_provider_number: "accreditation__number",
  provider_type: "provider__provider_type",
  address1: "address__address_line_1",
  address2: "address__address_line_2",
  address3: "address__address_line_3",
  town: "address__town_or_city",
  address4: "address__county",
  postcode: "address__postcode",
  latitude: "address__latitude",
  longitude: "address__longitude",
  academic_year_code: "provider__academic_year_code",
};

/**
 * Parse a CSV string into rows of fields.
 * @param {string} content
 * @returns {string[][]}
 */
function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // Ignore CR in CRLF.
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Escape a value for CSV output.
 * @param {string} value
 * @returns {string}
 */
function toCsvValue(value) {
  const text = value ?? "";
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Convert rows into a CSV string.
 * @param {string[][]} rows
 * @returns {string}
 */
function writeCsv(rows) {
  return rows.map((row) => row.map(toCsvValue).join(",")).join("\n") + "\n";
}

/**
 * Resolve a stable provider key (code first, then name+postcode).
 * @param {Record<string, string>} row
 * @returns {string}
 */
function providerKey(row) {
  // Prefer provider code for identity; fallback to name+postcode.
  if (row.provider_code) return `provider_code:${row.provider_code}`;
  const name = row.operating_name || row.legal_name || "";
  const postcode = row.postcode || "";
  return `fallback:${name}|${postcode}`;
}

/**
 * Extract year from a providers-YYYY.csv filename.
 * @param {string} filename
 * @returns {string|null}
 */
function yearFromFilename(filename) {
  const match = filename.match(/providers?-(\d{4})\.csv$/);
  return match ? match[1] : null;
}

/**
 * Build app/data/dist/providers.csv from yearly source files.
 * @returns {void}
 */
function main() {
  const dataDir = path.resolve(__dirname, "..");
  const srcDir = path.join(dataDir, "src", "providers");
  const distDir = path.join(dataDir, "dist");

  const files = fs
    .readdirSync(srcDir)
    .map((name) => ({
      name,
      year: yearFromFilename(name),
    }))
    .filter((item) => item.year)
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((item) => ({
      year: item.year,
      fullPath: path.join(srcDir, item.name),
    }));

  if (files.length === 0) {
    throw new Error(`No input files found in ${srcDir}`);
  }

  const providers = new Map();
  const order = [];

  for (const file of files) {
    const content = fs.readFileSync(file.fullPath, "utf8");
    const rows = parseCsv(content);
    const header = rows.shift();

    if (!header || header.join(",") !== EXPECTED_FIELDS.join(",")) {
      throw new Error(
        `Unexpected columns in ${path.basename(file.fullPath)}: ${header}`
      );
    }

    for (const values of rows) {
      const row = {};
      EXPECTED_FIELDS.forEach((field, index) => {
        row[field] = (values[index] ?? "").trim().replace(/\s+/g, " ");
      });

      // Track first-seen row per provider, and append any new years.
      const key = providerKey(row);
      const year = row.academic_year_code || file.year;
      if (!providers.has(key)) {
        providers.set(key, {
          row,
          years: [],
          yearsSet: new Set(),
        });
        order.push(key);
      }

      const record = providers.get(key);
      if (!record.yearsSet.has(year)) {
        record.years.push(year);
        record.yearsSet.add(year);
      }
    }
  }

  fs.mkdirSync(distDir, { recursive: true });
  const outputPath = path.join(distDir, "providers.csv");

  const outputRows = [OUTPUT_FIELDS];
  for (const key of order) {
    const record = providers.get(key);
    const row = {};
    OUTPUT_FIELDS.forEach((field) => {
      row[field] = "";
    });
    Object.entries(OUTPUT_MAP).forEach(([srcKey, destKey]) => {
      row[destKey] = record.row[srcKey] ?? "";
    });
    // Year list is newest→oldest because we process 2026→2019.
    row.provider__academic_years_active = record.years.join(",");
    row.provider__accreditation_status = row.accreditation__number
      ? "accredited"
      : "unaccredited";
    if (row.accreditation__number) {
      // Accreditation starts on 1 Aug of the earliest year seen.
      const earliestYear = Math.min(
        ...Array.from(record.yearsSet).map((year) => Number(year))
      );
      if (Number.isFinite(earliestYear)) {
        row.accreditation__start_date = `${earliestYear}-08-01T00:00:00Z`;
      }
    }
    outputRows.push(OUTPUT_FIELDS.map((field) => row[field] ?? ""));
  }

  fs.writeFileSync(outputPath, writeCsv(outputRows), "utf8");
  console.log(
    `Wrote ${order.length} providers from ${files.length} files to ${outputPath}`
  );
}

main();
