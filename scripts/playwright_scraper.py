"""
PayoutDelta — rate/fee scraping pipeline (Phase 2 ETL stub, Phase 1 placeholder).

Purpose
-------
Phase 1 ships a hand-maintained static snapshot at `data/fees.json` so the
exported Static Site Generator (Next.js `output: 'export'`) never depends on
live scraping at request time. This module is the scheduled crawler that will
REPLACE `data/fees.json` edition-by-edition once the Phase 2 backend lands.

It does NOT run during `next build` and MUST NOT be imported by any app code.
Only the markdown comment below documents the pipeline contract so the Phase 2
implementation stays deterministic.

Phase 2 contract
----------------
1. Crawl public provider fee/rate pages with Playwright:
   - PayPal cross-border fee table (per-corridor buy/sell + fixed fee)
   - Wise pricing page (per currency pair)
   - Payoneer global receiving fees
   - Bank remittance schedules (Swift / local incoming) per country
   - CBN / SBP / RBI official daily reference feeds where free
2. Normalize every observation into the exact shape of `data/fees.json`:
   schemaVersion / dataset / updatedAt + platforms[].feePercent +
   channels[].fees.fixedFeeUSD + channels[].fxSpread + corridors[].rate.
3. Upsert rows into the Phase 2 star schema
   (see `lib/db.ts`: fact_payout_quotes / dim_* tables) keyed on
   (corridor_id, channel_id, platform_id, date_id) so re-runs are idempotent.
4. Emit a diff report + `PR`/`change` into the artifact bucket so the static
   site and the rate-alert job both rebuild from one source of truth.

Anti-detection & stealth (provider pages resist headless browsers)
------------------------------------------------------------------
- Drive pages with `playwright-stealth` (chromium only): its `stealth_async`
  patch neutralizes `navigator.webdriver`, automation markers and the typical
  fingerprint tells so providers serve their regular (not bot-gated) page
  variants to the crawler.
- Pass explicit launch args: `--disable-blink-features=AutomationControlled`,
  `--no-sandbox`, plus a realistic pooled `viewport`/`locale`/timezone rotated
  per domain; keep a per-domain request throttle so the crawler stays far
  below provider rate limits and never trips WAF blocks.

Non-destructive overwrite guards
--------------------------------
- The ETL NEVER truncates in place. Scrape into a staging snapshot on disk,
  run `validate()` against it, and only then atomically `os.replace()` over
  `data/fees.json`. A mid-crawl crash therefore leaves the last good revision
  in place and the static site can always rebuild from it.

Run (Phase 2 wiring)
--------------------
    pip install playwright  && playwright install chromium
    python scripts/playwright_scraper.py --corridors usd-pkr usd-inr
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# CONFIG — keep in sync with the "resolved" shape of data/fees.json
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = REPO_ROOT / "data" / "fees.json"
SUPPORTED_CORRIDORS: List[str] = [
    "usd-pkr", "usd-inr", "usd-php", "usd-brl", "usd-gbp",
    "usd-eur", "usd-ngn", "usd-bdt", "usd-egp", "usd-zar",
]


def load_current_dataset() -> Dict[str, Any]:
    """Loads the committed snapshot; used as the fallback baseline."""
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def scrape_one_corridor(slug: str) -> Dict[str, Any]:
    """
    Phase 2 hook: returns a normalized corridor row directly usable as
    `corridors[]` content. Phase 1 stub returns a no-op echo so the CLI
    stays runnable today without network dependencies.
    """
    current = load_current_dataset()
    try:
        return next(c for c in current["corridors"] if c["slug"] == slug)
    except StopIteration:
        raise ValueError(f"unknown corridor slug: {slug}")


def validate(snapshot: Dict[str, Any]) -> None:
    """Type sanity checks so bad scrapes fail loudly, before publishing."""
    required = {"schemaVersion", "dataset", "updatedAt", "platforms",
                "channels", "corridors"}
    missing = required - set(snapshot)
    if missing:
        raise ValueError(f"snapshot missing keys: {sorted(missing)}")
    for corridor in snapshot["corridors"]:
        if not isinstance(corridor.get("rate"), (int, float)):
            raise ValueError(f"bad rate in corridor: {corridor.get('slug')}")


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corridors",
        default=",".join(SUPPORTED_CORRIDORS),
        help="comma-separated corridor slugs (default: all)",
    )
    parser.add_argument(
        "--emit",
        metavar="PATH",
        help="write the merged snapshot here instead of stdout",
    )
    args = parser.parse_args(argv)

    slugs = [s.strip() for s in args.corridors.split(",") if s.strip()]
    unknown = [s for s in slugs if s not in SUPPORTED_CORRIDORS]
    if unknown:
        print(f"[scraper] unsupported corridors: {unknown}", file=sys.stderr)
        return 2

    snapshot = load_current_dataset()
    for slug in slugs:
        snapshot["corridors"] = [
            scrape_one_corridor(slug) if c["slug"] == slug else c
            for c in snapshot["corridors"]
        ]
    validate(snapshot)

    payload = json.dumps(snapshot, indent=2, ensure_ascii=False)
    if args.emit:
        Path(args.emit).write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))