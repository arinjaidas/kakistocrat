#!/usr/bin/env python3
"""Reproduce the cash and time-adjusted commute accounting.
No installed dependencies, network use or personal data are required.
Run: python3 scripts/getting_to_work_analysis.py input.csv --output results.csv
Input may be blank (headers only). Empty input produces a header-only result.
"""
import argparse
import csv
import math
from pathlib import Path

COLUMNS = ["case_id", "city", "period", "scenario", "take_home_wage_inr",
           "housing_inr_month", "commute_cash_inr_day",
           "roundtrip_minutes_day", "buffer_minutes_day", "care_inr_month",
           "workdays_month", "value_time_inr_hour"]
METRICS = ["cash_remaining_inr_month", "commute_hours_month",
           "time_adjusted_remaining_inr_month"]

def nonnegative(row, key, line):
    try:
        value = float(row[key])
    except (TypeError, ValueError, KeyError):
        raise ValueError(f"row {line}: invalid {key}") from None
    if not math.isfinite(value) or value < 0:
        raise ValueError(f"row {line}: {key} must be finite and nonnegative")
    return value

def calculate(row, line):
    vals = {key: nonnegative(row, key, line) for key in COLUMNS[4:]}
    days = vals["workdays_month"]
    if days > 31 or not days.is_integer():
        raise ValueError(f"row {line}: workdays_month must be an integer 0..31")
    if vals["roundtrip_minutes_day"] + vals["buffer_minutes_day"] > 1440:
        raise ValueError(f"row {line}: journey and buffer exceed one day")
    cash = vals["take_home_wage_inr"] - vals["housing_inr_month"] \
        - vals["commute_cash_inr_day"] * days - vals["care_inr_month"]
    hours = (vals["roundtrip_minutes_day"] + vals["buffer_minutes_day"]) * days / 60
    adjusted = cash - hours * vals["value_time_inr_hour"]
    return {**row, "cash_remaining_inr_month": round(cash, 2),
            "commute_hours_month": round(hours, 4),
            "time_adjusted_remaining_inr_month": round(adjusted, 2)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Anonymised CSV meeting the published schema")
    parser.add_argument("--output", default="results.csv", help="Output CSV")
    args = parser.parse_args()
    with open(args.input, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise SystemExit("The file is empty, not a CSV template.")
        missing = [col for col in COLUMNS if col not in reader.fieldnames]
        if missing:
            raise SystemExit("Missing columns: " + ", ".join(missing))
        records = [calculate(row, line) for line, row in enumerate(reader, 2)]
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(dict.fromkeys(COLUMNS + METRICS)),
                                extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    print(f"Processed {len(records)} anonymised records into {args.output}.")
    if not records:
        print("No observations present; no sample statistics or outcomes were invented.")

if __name__ == "__main__":
    main()
