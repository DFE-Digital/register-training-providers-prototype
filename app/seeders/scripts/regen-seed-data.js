#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { v5: uuidv5 } = require("uuid");

const NAMESPACE = uuidv5.DNS;

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

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

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
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(content).filter((row) => row.length);
  if (!rows.length) return [];
  const header = rows.shift();
  return rows.map((row) => {
    const record = {};
    header.forEach((name, index) => {
      record[name] = row[index] ?? "";
    });
    return record;
  });
}

function trimToNull(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function ensureNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function findSeedFiles(dir, regex) {
  return fs
    .readdirSync(dir)
    .filter((name) => regex.test(name))
    .sort();
}

function rewriteSeederFile(seedersDir, regex, dataFileName, newSeederName) {
  const matches = findSeedFiles(seedersDir, regex);
  if (!matches.length) {
    throw new Error(`No seeder file found for ${regex}`);
  }
  const current = matches[matches.length - 1];
  const currentPath = path.join(seedersDir, current);
  const newPath = path.join(seedersDir, newSeederName);

  if (currentPath !== newPath) {
    fs.renameSync(currentPath, newPath);
  }

  let content = fs.readFileSync(newPath, "utf8");
  content = content.replace(
    /\/data\/\d{14}-seed-[a-z-]+\.json/g,
    `/data/${dataFileName}`
  );
  fs.writeFileSync(newPath, content);

  return { previous: current, current: newSeederName };
}

function main() {
  const baseDate = new Date();
  const timestampProviders = formatTimestamp(baseDate);
  const timestampAddresses = formatTimestamp(addSeconds(baseDate, 1));
  const timestampAccreditations = formatTimestamp(addSeconds(baseDate, 2));
  const timestampPartnerships = formatTimestamp(addSeconds(baseDate, 3));
  const appDir = path.join(__dirname, "..", "..");
  const distDir = path.join(appDir, "data", "dist");
  const seedersDir = path.join(appDir, "seeders");
  const seedDataDir = path.join(seedersDir, "data");

  const providersCsv = path.join(distDir, "providers.csv");
  const partnershipsCsv = path.join(distDir, "provider-partnerships.csv");

  const academicYearFiles = findSeedFiles(
    seedDataDir,
    /-seed-academic-years\.json$/
  );
  if (!academicYearFiles.length) {
    throw new Error("No seed-academic-years.json file found.");
  }
  const academicYears = JSON.parse(
    fs.readFileSync(path.join(seedDataDir, academicYearFiles.at(-1)), "utf8")
  );
  const academicYearIdByCode = new Map(
    academicYears.map((item) => [String(item.code), item.id])
  );

  const providers = [];
  const addresses = [];
  const accreditations = [];
  const providerIdByCode = new Map();
  const providerNameByCode = new Map();

  const providerRows = readCsv(providersCsv);
  for (const row of providerRows) {
    const code = trimToNull(row.provider__code);
    const ukprn = trimToNull(row.provider__ukprn);
    if (!code && !ukprn) continue;

    const providerId = uuidv5(`provider:${code || ukprn}`, NAMESPACE);
    providerIdByCode.set(code, providerId);

    const operatingName = trimToNull(row.provider__operating_name);
    const legalName = trimToNull(row.provider__legal_name);
    const providerType = trimToNull(row.provider__provider_type);
    const urn = trimToNull(row.provider__urn);
    const ukprnValue = ensureNumber(ukprn);

    providers.push({
      id: providerId,
      operatingName,
      legalName,
      type: providerType,
      code,
      ukprn: ukprnValue,
      urn,
      website: null,
    });

    providerNameByCode.set(code, operatingName || legalName || code);

    const line1 = trimToNull(row.address__address_line_1);
    const town = trimToNull(row.address__town_or_city);
    const postcode = trimToNull(row.address__postcode);
    if (line1 && town && postcode) {
      addresses.push({
        id: uuidv5(`provider-address:${providerId}`, NAMESPACE),
        providerId,
        providerName: providerNameByCode.get(code) || code,
        line1,
        line2: trimToNull(row.address__address_line_2),
        line3: trimToNull(row.address__address_line_3),
        town,
        county: trimToNull(row.address__county),
        postcode,
        latitude: ensureNumber(trimToNull(row.address__latitude)),
        longitude: ensureNumber(trimToNull(row.address__longitude)),
      });
    }

    const accreditationNumber = trimToNull(row.accreditation__number);
    if (accreditationNumber) {
      const startsOn = trimToNull(row.accreditation__start_date);
      const endsOn = trimToNull(row.accreditation__end_date);
      accreditations.push({
        id: uuidv5(
          `provider-accreditation:${providerId}:${accreditationNumber}:${startsOn || ""}:${endsOn || ""}`,
          NAMESPACE
        ),
        providerId,
        providerName: providerNameByCode.get(code) || code,
        number: accreditationNumber,
        startsOn,
        endsOn,
      });
    }
  }

  const partnerships = [];
  const missingCodes = new Set();
  const partnershipRows = readCsv(partnershipsCsv);

  for (const row of partnershipRows) {
    const accreditedCode = trimToNull(
      row.partnership__accredited_provider_provider_code
    );
    const trainingCode = trimToNull(
      row.partnership__training_partner_provider_code
    );

    if (!accreditedCode || !trainingCode) continue;

    const accreditedId = providerIdByCode.get(accreditedCode);
    const trainingId = providerIdByCode.get(trainingCode);

    if (!accreditedId || !trainingId) {
      if (!accreditedId) missingCodes.add(accreditedCode);
      if (!trainingId) missingCodes.add(trainingCode);
      continue;
    }

    const startsOn = trimToNull(row.partnership__start_date);
    const endsOn = trimToNull(row.partnership__end_date);

    const academicYearIds = [];
    const yearsActive = trimToNull(row.partnership__academic_years_active);
    if (yearsActive) {
      yearsActive.split(",").forEach((year) => {
        const code = year.trim();
        const id = academicYearIdByCode.get(code);
        if (id) academicYearIds.push(id);
      });
    }

    partnerships.push({
      id: uuidv5(
        `provider-partnership:${accreditedId}:${trainingId}:${startsOn || ""}:${endsOn || ""}`,
        NAMESPACE
      ),
      trainingPartnerId: trainingId,
      trainingPartnerName: providerNameByCode.get(trainingCode) || trainingCode,
      accreditedProviderId: accreditedId,
      accreditedProviderName:
        providerNameByCode.get(accreditedCode) || accreditedCode,
      startsOn,
      endsOn,
      academicYearIds,
    });
  }

  const dataFiles = {
    providers: `${timestampProviders}-seed-providers.json`,
    addresses: `${timestampAddresses}-seed-provider-addresses.json`,
    accreditations: `${timestampAccreditations}-seed-provider-accreditations.json`,
    partnerships: `${timestampPartnerships}-seed-provider-partnership.json`,
  };

  const dataTargets = [
    {
      kind: "providers",
      fileName: dataFiles.providers,
      payload: providers,
      regex: /-seed-providers\.json$/,
    },
    {
      kind: "addresses",
      fileName: dataFiles.addresses,
      payload: addresses,
      regex: /-seed-provider-addresses\.json$/,
    },
    {
      kind: "accreditations",
      fileName: dataFiles.accreditations,
      payload: accreditations,
      regex: /-seed-provider-accreditations\.json$/,
    },
    {
      kind: "partnerships",
      fileName: dataFiles.partnerships,
      payload: partnerships,
      regex: /-seed-provider-partnership\.json$/,
    },
  ];

  dataTargets.forEach(({ fileName, payload, regex }) => {
    const targetPath = path.join(seedDataDir, fileName);
    fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);

    const oldFiles = findSeedFiles(seedDataDir, regex).filter(
      (name) => name !== fileName
    );
    oldFiles.forEach((name) => {
      fs.unlinkSync(path.join(seedDataDir, name));
    });
  });

  const seederUpdates = [
    {
      regex: /-seed-providers\.js$/,
      dataFileName: dataFiles.providers,
      newSeederName: `${timestampProviders}-seed-providers.js`,
    },
    {
      regex: /-seed-provider-addresses\.js$/,
      dataFileName: dataFiles.addresses,
      newSeederName: `${timestampAddresses}-seed-provider-addresses.js`,
    },
    {
      regex: /-seed-provider-accreditations\.js$/,
      dataFileName: dataFiles.accreditations,
      newSeederName: `${timestampAccreditations}-seed-provider-accreditations.js`,
    },
    {
      regex: /-seed-provider-partnerships\.js$/,
      dataFileName: dataFiles.partnerships,
      newSeederName: `${timestampPartnerships}-seed-provider-partnerships.js`,
    },
  ];

  const renames = seederUpdates.map((update) =>
    rewriteSeederFile(
      seedersDir,
      update.regex,
      update.dataFileName,
      update.newSeederName
    )
  );

  console.log("Seed data regenerated:");
  console.log(`- providers: ${providers.length}`);
  console.log(`- addresses: ${addresses.length}`);
  console.log(`- accreditations: ${accreditations.length}`);
  console.log(`- partnerships: ${partnerships.length}`);

  if (missingCodes.size) {
    console.warn(
      `Missing provider codes in partnerships: ${[...missingCodes].join(", ")}`
    );
  }

  console.log("Seeder files updated:");
  renames.forEach(({ previous, current }) => {
    if (previous !== current) {
      console.log(`- ${previous} -> ${current}`);
    } else {
      console.log(`- ${current}`);
    }
  });
}

try {
  main();
} catch (error) {
  console.error("Failed to regenerate seed data:", error.message);
  process.exitCode = 1;
}
