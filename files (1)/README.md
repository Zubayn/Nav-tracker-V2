# Unit Trust Charts

Static site (GitHub Pages) showing Malaysian unit trust NAV charts —
ASN, and bank/other unit trust funds.

## How the data works

All fund data lives in **`data/funds.json`**. The front end (`script.js`)
reads only from this file. There are two ways data gets in:

### 1. Manual entry (for sites that don't permit scraping)

Some sources — notably **ASNB** (ASN/ASM) — disallow automated access in
their `robots.txt`. For these, read the NAV off their official page yourself
and record it:

```bash
python scraper/add_manual_nav.py ASN 0.7549
# or with an explicit date:
python scraper/add_manual_nav.py ASN 0.7549 --date 2026-07-10
```

Reading a number off a website and typing it in is not scraping. This is the
correct, terms-compliant way to include these funds.

### 2. Scraper (for sites that DO permit it)

`scraper/scrape_nav.py` handles sources that allow automated access. It ships
with **no sources enabled**. Before enabling any source you must confirm:

1. The site's `robots.txt` allows the target path, **and**
2. The site's Terms of Use don't prohibit automated / bulk data extraction.

Only then add it to the `SOURCES` list with `enabled: True`. As a backstop,
the script also re-checks `robots.txt` live at runtime and skips anything
disallowed — but that does not replace step 2 (Terms of Use), which you must
check manually.

**Do not add ASNB or any site that disallows scraping.** Use manual entry.

## Charts

A fund's line chart appears once it has at least 3 recorded NAV points
(`MIN_POINTS_FOR_CHART` in `script.js`). Until then the card shows a
"collecting data" note. Fixed-price funds (ASM) show their distribution note
instead of a NAV line, since their price is pegged at RM1.00.

## Local preview

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Committing to the `main` branch auto-publishes via GitHub Pages to
https://unittrustcharts.com

## Disclaimer

NAV figures are for information only, sourced from each fund manager's
published data. Not investment advice. Always verify against the official
source before making decisions.
