#!/usr/bin/env python3
"""
NAV scraper — for sources that PERMIT automated access only.

SAFETY DESIGN:
  1. Every source in SOURCES must have `enabled: True` set by YOU, and you
     should only set that after confirming BOTH:
       (a) the site's robots.txt allows the target path, and
       (b) the site's Terms of Use don't prohibit automated data extraction.
  2. Even for enabled sources, this script re-checks robots.txt live at runtime
     via urllib.robotparser and SKIPS any URL that robots disallows. This is a
     backstop, not a substitute for step 1.
  3. Sites known to disallow scraping (e.g. ASNB) must NOT be added here.
     Use scraper/add_manual_nav.py for those.

Run:
    python scraper/scrape_nav.py
"""
import json
import sys
import urllib.robotparser
from datetime import date
from pathlib import Path

import requests

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "funds.json"
USER_AGENT = "UnitTrustChartsBot/1.0 (+https://unittrustcharts.com; contact: you@example.com)"

# ---------------------------------------------------------------------------
# SOURCES: all disabled by default. Enable ONLY after verifying robots.txt AND
# Terms of Use for that specific site. Each `parse` function receives the raw
# HTML/JSON text and must return a dict of {fund_code: nav_float}.
# ---------------------------------------------------------------------------
SOURCES = [
    # Example template — DISABLED. Fill in and enable only if permitted.
    # {
    #     "name": "Example Fund Manager",
    #     "enabled": False,
    #     "url": "https://example.com/fund-prices.json",
    #     "robots_url": "https://example.com/robots.txt",
    #     "parse": lambda text: parse_example(text),
    # },
]


def robots_allows(robots_url: str, target_url: str) -> bool:
    """Return True only if the site's robots.txt explicitly allows our UA."""
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
    except Exception as e:
        print(f"  ! Could not read {robots_url} ({e}); refusing to scrape.")
        return False
    return rp.can_fetch(USER_AGENT, target_url)


def load():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def save(data):
    data["updated"] = date.today().isoformat()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def record(data, code, nav, today):
    fund = next((f for f in data["funds"] if f["code"].upper() == code.upper()), None)
    if fund is None:
        print(f"  ! Fund {code} not in funds.json; skipping (add it first).")
        return
    existing = next((h for h in fund["history"] if h["date"] == today), None)
    if existing:
        existing["nav"] = nav
    else:
        fund["history"].append({"date": today, "nav": nav})
    fund["history"].sort(key=lambda h: h["date"])


def main():
    enabled = [s for s in SOURCES if s.get("enabled")]
    if not enabled:
        print("No sources enabled. Nothing to scrape.")
        print("To enable a source: verify its robots.txt + Terms of Use, then set enabled=True.")
        return

    data = load()
    today = date.today().isoformat()
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    for src in enabled:
        print(f"Source: {src['name']}")
        if not robots_allows(src["robots_url"], src["url"]):
            print(f"  ✗ robots.txt disallows {src['url']} — skipping.")
            continue
        try:
            resp = session.get(src["url"], timeout=20)
            resp.raise_for_status()
            navs = src["parse"](resp.text)
        except Exception as e:
            print(f"  ✗ fetch/parse failed: {e}")
            continue
        for code, nav in navs.items():
            record(data, code, float(nav), today)
            print(f"  ✓ {code} = RM {float(nav):.4f}")

    save(data)
    print("Done.")


if __name__ == "__main__":
    main()
