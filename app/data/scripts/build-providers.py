#!/usr/bin/env python3
import csv
import re
from pathlib import Path


EXPECTED_FIELDS = [
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
]

OUTPUT_FIELDS = [
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
]

OUTPUT_MAP = {
    "operating_name": "provider__operating_name",
    "legal_name": "provider__legal_name",
    "ukprn": "provider__ukprn",
    "urn": "provider__urn",
    "provider_code": "provider__code",
    "accredited_provider_number": "accreditation__number",
    "provider_type": "provider__provider_type",
    "address1": "address__address_line_1",
    "address2": "address__address_line_2",
    "address3": "address__address_line_3",
    "town": "address__town_or_city",
    "address4": "address__county",
    "postcode": "address__postcode",
    "latitude": "address__latitude",
    "longitude": "address__longitude",
    "academic_year_code": "provider__academic_year_code",
}


def provider_key(row):
    # Prefer provider code for identity; fallback to name+postcode.
    if row.get("provider_code"):
        return f"provider_code:{row['provider_code']}"
    # Fallback: match on provider name if code is missing.
    name = row.get("operating_name") or row.get("legal_name") or ""
    postcode = row.get("postcode") or ""
    return f"fallback:{name}|{postcode}"


def year_from_filename(path):
    match = re.search(r"providers?-(\d{4})\.csv$", path.name)
    if not match:
        return None
    return match.group(1)


def main():
    data_dir = Path(__file__).resolve().parents[1]
    src_dir = data_dir / "src" / "providers"
    dist_dir = data_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)

    files = []
    for pattern in ("providers-*.csv", "provider-*.csv"):
        for path in src_dir.glob(pattern):
            year = year_from_filename(path)
            if year:
                files.append((year, path))

    files.sort(key=lambda item: item[0], reverse=True)

    if not files:
        raise SystemExit(f"No input files found in {src_dir}")

    providers = {}
    order = []

    for file_year, path in files:
        with path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames and reader.fieldnames != EXPECTED_FIELDS:
                raise SystemExit(
                    f"Unexpected columns in {path.name}: {reader.fieldnames}"
                )
            for row in reader:
                # Track first-seen row per provider, and append any new years.
                key = provider_key(row)
                year = row.get("academic_year_code") or file_year
                if key not in providers:
                    providers[key] = {
                        "row": row,
                        "years": [],
                        "years_set": set(),
                    }
                    order.append(key)
                record = providers[key]
                if year not in record["years_set"]:
                    record["years"].append(year)
                    record["years_set"].add(year)

    output_path = dist_dir / "providers.csv"
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        for key in order:
            record = providers[key]
            src_row = record["row"]
            out_row = {field: "" for field in OUTPUT_FIELDS}
            for src_key, dest_key in OUTPUT_MAP.items():
                out_row[dest_key] = src_row.get(src_key, "")
            # Year list is newest→oldest because we process 2026→2019.
            out_row["provider__academic_years_active"] = ",".join(record["years"])
            out_row["provider__accreditation_status"] = (
                "accredited" if out_row.get("accreditation__number") else "unaccredited"
            )
            if out_row.get("accreditation__number"):
                # Accreditation starts on 1 Aug of the earliest year seen.
                try:
                    earliest_year = min(int(y) for y in record["years_set"])
                    out_row["accreditation__start_date"] = f"{earliest_year}-08-01"
                except ValueError:
                    pass
            writer.writerow(out_row)

    print(
        f"Wrote {len(order)} providers from {len(files)} files to {output_path}"
    )


if __name__ == "__main__":
    main()
