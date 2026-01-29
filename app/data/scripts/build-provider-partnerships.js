#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

/**
 * Columns expected in source CSVs.
 * @type {string[]}
 */
const EXPECTED_FIELDS = [
  "accredited_provider_name",
  "accredited_provider_code",
  "training_provider_name",
  "training_provider_code",
  "academic_year_code",
];

/**
 * Columns emitted in provider-partnerships.csv (ordered).
 * @type {string[]}
 */
const OUTPUT_FIELDS = [
  "partnership__accredited_provider_name",
  "partnership__accredited_provider_provider_code",
  "partnership__training_partner_name",
  "partnership__training_partner_provider_code",
  "partnership__academic_year_code",
  "partnership__academic_years_active",
  "partnership__start_date",
  "partnership__end_date",
];

/**
 * Mapping of source columns to output columns.
 * @type {Record<string, string>}
 */
const OUTPUT_MAP = {
  accredited_provider_name: "partnership__accredited_provider_name",
  accredited_provider_code: "partnership__accredited_provider_provider_code",
  training_provider_name: "partnership__training_partner_name",
  training_provider_code: "partnership__training_partner_provider_code",
  academic_year_code: "partnership__academic_year_code",
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
 * Resolve a stable partnership key (codes first, then names).
 * @param {Record<string, string>} row
 * @returns {string}
 */
function partnershipKey(row) {
  if (row.accredited_provider_code || row.training_provider_code) {
    return `codes:${row.accredited_provider_code || ""}|${
      row.training_provider_code || ""
    }`;
  }
  return `names:${row.accredited_provider_name || ""}|${
    row.training_provider_name || ""
  }`;
}

/**
 * Extract year from a provider-partnerships-YYYY.csv filename.
 * @param {string} filename
 * @returns {string|null}
 */
function yearFromFilename(filename) {
  const match = filename.match(/provider-partnerships-(\d{4})\.csv$/);
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
 * Build app/data/dist/provider-partnerships.csv from yearly source files.
 * @returns {void}
 */
function main() {
  const dataDir = path.resolve(__dirname, "..");
  const srcDir = path.join(dataDir, "src", "partnerships");
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

  const currentYear = Math.max(...files.map((file) => Number(file.year)));
  const partnerships = new Map();
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
        row[field] = values[index] ?? "";
      });

      const key = partnershipKey(row);
      const year = row.academic_year_code || file.year;
      if (!partnerships.has(key)) {
        partnerships.set(key, {
          row,
          years: [],
          yearsSet: new Set(),
        });
        order.push(key);
      }

      const record = partnerships.get(key);
      if (!record.yearsSet.has(year)) {
        record.years.push(year);
        record.yearsSet.add(year);
      }
    }
  }

  const outputPath = resolveOutputPath(distDir, "provider-partnerships.csv");

  const outputRows = [OUTPUT_FIELDS];
  for (const key of order) {
    const record = partnerships.get(key);
    const row = {};
    OUTPUT_FIELDS.forEach((field) => {
      row[field] = "";
    });
    Object.entries(OUTPUT_MAP).forEach(([srcKey, destKey]) => {
      row[destKey] = record.row[srcKey] ?? "";
    });

    row.partnership__academic_years_active = record.years.join(",");

    const years = Array.from(record.yearsSet).map((year) => Number(year));
    const earliestYear = Math.min(...years);
    const latestYear = Math.max(...years);
    if (Number.isFinite(earliestYear)) {
      row.partnership__start_date = `${earliestYear}-08-01T00:00:00Z`;
    }
    if (Number.isFinite(latestYear) && latestYear < currentYear) {
      row.partnership__end_date = `${latestYear + 1}-07-31T00:00:00Z`;
    }

    outputRows.push(OUTPUT_FIELDS.map((field) => row[field] ?? ""));
  }

  fs.writeFileSync(outputPath, writeCsv(outputRows), "utf8");
  console.log(
    `Wrote ${order.length} partnerships from ${files.length} files to ${outputPath}`
  );
}

main();
