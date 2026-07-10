#!/usr/bin/env python3
"""
Manual NAV entry helper.

Reads the NAV price yourself from the fund manager's official website,
then run this to record it. This is NOT scraping — you're typing in a
value you looked at, same as noting it in a spreadsheet.

Usage:
    python scraper/add_manual_nav.py ASN 0.7549
    python scraper/add_manual_nav.py ASN 0.7549 --date 2026-07-10

If the fund code doesn't exist yet, you'll be prompted to create it.
"""
import json
import sys
import argparse
from datetime import date
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "funds.json"


def load():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def save(data):
    data["updated"] = date.today().isoformat()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main():
    p = argparse.ArgumentParser(description="Add a manual NAV entry.")
    p.add_argument("code", help="Fund code, e.g. ASN")
    p.add_argument("nav", type=float, help="NAV per unit in RM, e.g. 0.7549")
    p.add_argument("--date", default=date.today().isoformat(),
                   help="Date YYYY-MM-DD (default: today)")
    args = p.parse_args()

    data = load()
    fund = next((f for f in data["funds"] if f["code"].upper() == args.code.upper()), None)

    if fund is None:
        print(f"Fund '{args.code}' not found.")
        create = input("Create it? [y/N] ").strip().lower()
        if create != "y":
            sys.exit(0)
        fund = {
            "code": args.code.upper(),
            "name": input("Full fund name: ").strip(),
            "manager": input("Fund manager: ").strip(),
            "type": "variable",
            "source": "manual",
            "note": "",
            "color": "#6FA8DC",
            "history": [],
        }
        data["funds"].append(fund)

    # Prevent duplicate date entries; update if same date re-entered.
    existing = next((h for h in fund["history"] if h["date"] == args.date), None)
    if existing:
        print(f"Updating existing entry for {args.date}: {existing['nav']} -> {args.nav}")
        existing["nav"] = args.nav
    else:
        fund["history"].append({"date": args.date, "nav": args.nav})

    fund["history"].sort(key=lambda h: h["date"])
    save(data)
    print(f"✓ Recorded {fund['code']} = RM {args.nav:.4f} on {args.date}")
    print(f"  {len(fund['history'])} data point(s) now stored for this fund.")


if __name__ == "__main__":
    main()
