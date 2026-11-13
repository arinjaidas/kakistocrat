"""Reproduce the RBI lending and deposit comparison using only the Python standard library.

Run: python3 repo_transmission.py repo-transmission.csv
The result is CSV on stdout. Changes are relative to the first observation.
"""

import argparse
import csv
import sys
from decimal import Decimal

FIELDS = (
    "repo_pct",
    "fresh_loans_pct",
    "outstanding_loans_pct",
    "fresh_deposits_pct",
    "outstanding_deposits_pct",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv")
    args = parser.parse_args()

    with open(args.input_csv, newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    if not rows:
        parser.error("The input must contain at least one observation.")

    first = rows[0]
    writer = csv.writer(sys.stdout)
    writer.writerow(["month", *(field.removesuffix("_pct") + "_change_bp" for field in FIELDS)])
    for row in rows:
        changes = [int((Decimal(row[field]) - Decimal(first[field])) * 100) for field in FIELDS]
        writer.writerow([row["month"], *changes])


if __name__ == "__main__":
    main()
