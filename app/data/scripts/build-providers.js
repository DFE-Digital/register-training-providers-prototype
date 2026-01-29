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
 * Columns expected in accredited-providers.csv.
 * @type {string[]}
 */
const ACCREDITED_FIELDS = [
  "provider__code",
  "provider__legal_name",
  "provider__operating_name",
  "accreditation__number",
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
  "address__note",
  "provider__academic_years_active",
  "provider__academic_year_code",
];

/**
 * UK postcode format for validation.
 * @type {RegExp}
 */
const POSTCODE_REGEX =
  /^((GIR 0AA)|((([A-Z]{1,2}[0-9][0-9A-Z]?)|([A-Z]{1,2}[0-9]{1,2})) ?[0-9][A-Z]{2}))$/i;

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
 * Normalize a postcode to standard spacing (e.g. "RG 2 8RH" -> "RG2 8RH").
 * Returns the original value if it cannot be validated.
 * @param {string} postcode
 * @returns {string}
 */
function normalizePostcode(postcode) {
  const cleaned = (postcode ?? "").toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return "";
  const formatted = `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
  return POSTCODE_REGEX.test(formatted) ? formatted : postcode;
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
 * Build a lookup of provider code to accredited legal name.
 * @param {string} filePath
 * @returns {Map<string, string>}
 */
function loadAccreditedLegalNames(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing accredited providers file: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(content);
  const header = rows.shift();
  if (!header || header.join(",") !== ACCREDITED_FIELDS.join(",")) {
    throw new Error(
      `Unexpected columns in ${path.basename(filePath)}: ${header}`
    );
  }
  const map = new Map();
  for (const values of rows) {
    const row = {};
    ACCREDITED_FIELDS.forEach((field, index) => {
      row[field] = (values[index] ?? "").trim().replace(/\s+/g, " ");
    });
    if (!row.provider__code) continue;
    map.set(row.provider__code, row.provider__legal_name ?? "");
  }
  return map;
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
 * Format a timestamp for filenames (YYYYMMDDHHmmss).
 * @param {Date} date
 * @returns {string}
 */
function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

/**
 * Ensure dist directory exists and resolve output path.
 * @param {string} distDir
 * @param {string} baseName
 * @returns {string}
 */
function resolveOutputPath(distDir, baseName) {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputPath = path.join(distDir, baseName);
  if (!fs.existsSync(outputPath)) {
    return outputPath;
  }

  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext);
  const timestamp = formatTimestamp(new Date());
  let candidate = path.join(distDir, `${stem}-${timestamp}${ext}`);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(distDir, `${stem}-${timestamp}-${counter}${ext}`);
    counter += 1;
  }

  return candidate;
}

/**
 * Build app/data/dist/providers.csv from yearly source files.
 * @returns {void}
 */
function main() {
  const dataDir = path.resolve(__dirname, "..");
  const srcDir = path.join(dataDir, "src", "providers");
  const accreditedPath = path.join(
    dataDir,
    "src",
    "market-regs",
    "accredited-providers.csv"
  );
  const distDir = path.join(dataDir, "dist");
  const accreditedLegalNames = loadAccreditedLegalNames(accreditedPath);

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
          accreditationYearsSet: new Set(),
        });
        order.push(key);
      }

      const record = providers.get(key);
      if (!record.yearsSet.has(year)) {
        record.years.push(year);
        record.yearsSet.add(year);
      }
      if (row.accredited_provider_number) {
        record.accreditationYearsSet.add(year);
      }
    }
  }

  const outputPath = resolveOutputPath(distDir, "providers.csv");

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
    if (row.provider__code) {
      row.provider__legal_name =
        accreditedLegalNames.get(row.provider__code) ?? "";
    } else {
      row.provider__legal_name = "";
    }
    if (row.address__postcode) {
      row.address__postcode = normalizePostcode(row.address__postcode);
    }
    const addressNotes = [];
    if (!row.address__address_line_1) {
      addressNotes.push("missing address__address_line_1");
    }
    if (!row.address__town_or_city) {
      addressNotes.push("missing address__town_or_city");
    }
    if (!row.address__postcode) {
      addressNotes.push("missing address__postcode");
    } else if (!POSTCODE_REGEX.test(row.address__postcode)) {
      addressNotes.push("invalid address__postcode");
    }
    row.address__note = addressNotes.join(",");
    // Year list is newest→oldest because we process 2026→2019.
    row.provider__academic_years_active = record.years.join(",");
    row.provider__accreditation_status = row.accreditation__number
      ? "accredited"
      : "unaccredited";
    if (row.accreditation__number && record.accreditationYearsSet.size > 0) {
      // Accreditation starts on 1 Aug of the earliest year seen.
      const accreditationYears = Array.from(record.accreditationYearsSet).map(
        (year) => Number(year)
      );
      const earliestYear = Math.min(...accreditationYears);
      const latestYear = Math.max(...accreditationYears);
      if (Number.isFinite(earliestYear)) {
        row.accreditation__start_date = `${earliestYear}-08-01T00:00:00Z`;
      }
      if (Number.isFinite(latestYear) && latestYear < 2026) {
        row.accreditation__end_date = `${latestYear + 1}-07-31T00:00:00Z`;
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
