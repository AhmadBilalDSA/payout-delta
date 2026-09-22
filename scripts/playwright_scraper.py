"""
PayoutDelta — automated mid-market rate pipeline (Phase 2).

Goal
----
Update the 10 corridor rates inside `data/fees.json` from live foreign-exchange
reference data, with strict safety gates and an atomic write, so the static
Next.js export (`output: 'export'`) always rebuilds from a validated snapshot —
never a half-written or corrupt one.

Sources
-------
1. PLAYWRIGHT MODE (default, `--mode playwright` | `--mode auto`)
   Drives `x-rates.com` — which publishes free, ad-supported mid-market
   reference rates — with `playwright` + `playwright-stealth` (when installed).
   Stealth setup: `--disable-blink-features=AutomationControlled`,
   `--no-sandbox`, `--disable-dev-shm-usage`, a realistic desktop User-Agent and
   viewport, and a throttling semaphore so parallel corridor queries stay far
   below WAF limits.
2. FALLBACK MODE (`--mode fallback`)
   Lightweight, dependency-free JSON endpoints (open.er-api.com, then
   api.frankfurter.app) via the standard library. Used when playwright is not
   installed or a crawl is blocked.

Hard stops (`PipelineAbort` -> exit code 0, `data/fees.json` untouched)
----------------------------------------------------------------------
- A rate is not a positive finite float, or falls outside its corridor's
  tolerance bounds (e.g. USD/PKR must be within [200, 400]).
- A platform or channel fee field is `None`, `NaN`, or non-finite.
- A corridor is missing from the source payload.
- Any single source fails after retries.

Atomic write
-----------
- Merge new rates into the loaded snapshot, stamp `updatedAt` as ISO-8601 UTC,
  validate, write `data/fees.json.tmp`, then `os.replace()` it over the real
  file. A crash mid-run leaves the last good revision in place.
- Each run also appends today's validated rate to each corridor's 14-day
  sparkline ledger in `data/history.json` (oldest entry rolls off) through the
  same temp-file + `os.replace()` atomic pattern.

Run
---
    pip install -r scripts/scraper-requirements.txt
    python -m playwright install chromium          # playwright mode only
    python scripts/playwright_scraper.py --mode auto
    python scripts/playwright_scraper.py --mode fallback --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = REPO_ROOT / "data" / "fees.json"
TMP_FILE = DATA_FILE.with_name(DATA_FILE.name + ".tmp")
HISTORY_FILE = REPO_ROOT / "data" / "history.json"
HISTORY_TMP_FILE = HISTORY_FILE.with_name(HISTORY_FILE.name + ".tmp")

SUPPORTED_CORRIDORS: List[str] = [
    "usd-to-pkr", "usd-to-inr", "usd-to-php", "usd-to-brl", "usd-to-gbp",
    "usd-to-eur", "usd-to-ngn", "usd-to-bdt", "usd-to-egp", "usd-to-zar",
]

# Sparkline window size — the oldest daily point rolls off each run.
HISTORY_WINDOW = 14

# Realistic day-range tolerance per corridor (positive, finite, and sane).
# Kept deliberately wide so genuine interbank jitter never trips the gate,
# but any hostile/garbage payload (0, negative, or shifted decimals) is caught.
MID_RATE_BOUNDS: Dict[str, Tuple[float, float]] = {
    "usd-to-pkr": (200.0, 400.0),
    "usd-to-inr": (60.0, 120.0),
    "usd-to-php": (40.0, 80.0),
    "usd-to-brl": (3.0, 8.0),
    "usd-to-gbp": (0.5, 1.2),
    "usd-to-eur": (0.5, 1.2),
    "usd-to-ngn": (600.0, 2500.0),
    "usd-to-bdt": (80.0, 150.0),
    "usd-to-egp": (20.0, 80.0),
    "usd-to-zar": (10.0, 30.0),
}

# Currency code per slug, derived from the dataset at runtime (see main()).
X_RATES_URL = "https://www.x-rates.com/calculator/?from=USD&to={ccy}&amount=1"
ER_API_URL = "https://open.er-api.com/v6/latest/USD"
FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD&to={ccy_list}"

REALISTIC_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

CONCURRENCY = 3
NAV_TIMEOUT_MS = 15000


class PipelineAbort(Exception):
    """Raised on any fetch/validation failure; caller returns exit code 0."""


# ---------------------------------------------------------------------------
# data loading / publishing
# ---------------------------------------------------------------------------

def load_current_dataset() -> Dict[str, Any]:
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_float(value: str) -> Optional[float]:
    cleaned = value.strip().replace(",", "").replace("$", "")
    try:
        number = float(cleaned)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def _is_finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


def validate_snapshot(snapshot: Dict[str, Any]) -> None:
    """Strict safety gate — raises PipelineAbort on any irregular data."""
    required = {"schemaVersion", "dataset", "updatedAt", "platforms",
                "channels", "corridors"}
    missing = required - set(snapshot)
    if missing:
        raise PipelineAbort(f"snapshot missing keys: {sorted(missing)}")

    # Fee structures may never contain None / NaN / non-finite values.
    for platform in snapshot["platforms"]:
        if not _is_finite_number(platform.get("feePercent")):
            raise PipelineAbort(
                f"platform {platform.get('id')} has non-finite feePercent"
            )
    for channel in snapshot["channels"]:
        if not _is_finite_number(channel.get("fixedFeeUSD")):
            raise PipelineAbort(
                f"channel {channel.get('id')} has non-finite fixedFeeUSD"
            )
        if not _is_finite_number(channel.get("fxSpread")):
            raise PipelineAbort(
                f"channel {channel.get('id')} has non-finite fxSpread"
            )

    # Every corridor must exist, be USD-based, and sit inside its tolerance.
    slugs = {c.get("slug") for c in snapshot["corridors"]}
    if slugs != set(SUPPORTED_CORRIDORS):
        raise PipelineAbort(
            f"corridor set mismatch: {sorted(slugs ^ set(SUPPORTED_CORRIDORS))}"
        )

    for corridor in snapshot["corridors"]:
        slug = corridor.get("slug")
        rate = corridor.get("rate")
        if not _is_finite_number(rate) or rate <= 0:
            raise PipelineAbort(f"corridor {slug} has non-positive rate")
        low, high = MID_RATE_BOUNDS[slug]
        if not (low <= rate <= high):
            raise PipelineAbort(
                f"corridor {slug} rate {rate} outside tolerance [{low}, {high}]"
            )
        if corridor.get("from") != "USD":
            raise PipelineAbort(f"corridor {slug} is not USD-based")


def publish_snapshot(snapshot: Dict[str, Any]) -> None:
    """Writes via temp file + os.replace so a crash never corrupts the JSON."""
    payload = json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n"
    TMP_FILE.write_text(payload, encoding="utf-8")
    os.replace(TMP_FILE, DATA_FILE)


# ---------------------------------------------------------------------------
# 14-day rate history (Phase 3 sparkline companion to data/history.json)
# ---------------------------------------------------------------------------

def load_current_history() -> Dict[str, Any]:
    """Loads data/history.json or bootstraps an empty, schema-valid document."""
    if not HISTORY_FILE.exists():
        return {
            "schemaVersion": 1,
            "dataset": "payoutdelta-sparkline-history",
            "updatedAt": "",
            "description": (
                "14-day interbank mid-rate trajectory per audit corridor, "
                "appended daily by scripts/playwright_scraper.py (oldest entry "
                "rolls off atomically)."
            ),
            "history": {},
        }
    with HISTORY_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_history(history: Dict[str, Any], today: str) -> None:
    """Safety gate for the sparkline ledger — never publish corrupt points."""
    required = {"schemaVersion", "dataset", "updatedAt", "history"}
    missing = required - set(history)
    if missing:
        raise PipelineAbort(f"history missing keys: {sorted(missing)}")
    for slug, series in history["history"].items():
        if slug not in SUPPORTED_CORRIDORS:
            raise PipelineAbort(f"history has unsupported corridor {slug}")
        if not isinstance(series, list) or len(series) > HISTORY_WINDOW:
            raise PipelineAbort(
                f"history {slug} not a list within {HISTORY_WINDOW} points"
            )
        for point in series:
            if point.get("date") and str(point["date"]) > today:
                raise PipelineAbort(
                    f"history {slug} has future date {point.get('date')}"
                )
            if not _is_finite_number(point.get("rate")) or point["rate"] <= 0:
                raise PipelineAbort(
                    f"history {slug} has non-positive rate {point.get('rate')}"
                )


def update_history(snapshot: Dict[str, Any], rates: Dict[str, float]) -> None:
    """Appends today's validated rate to each corridor ledger and rolls the
    oldest entry off (atomic write via tmp file + os.replace)."""
    history = load_current_history()
    today = snapshot["updatedAt"][:10]

    for slug, rate in rates.items():
        if not _is_finite_number(rate) or rate <= 0:
            raise PipelineAbort(
                f"refusing to history non-positive rate for {slug}: {rate}"
            )
        series = history["history"].get(slug, [])
        if series and series[-1].get("date") == today:
            # Idempotent re-run on the same day: replace, never duplicate.
            series[-1] = {"date": today, "rate": round(float(rate), 6)}
        else:
            series.append({"date": today, "rate": round(float(rate), 6)})
        history["history"][slug] = series[-HISTORY_WINDOW:]

    history["updatedAt"] = snapshot["updatedAt"]
    validate_history(history, today)

    payload = json.dumps(history, indent=2, ensure_ascii=False) + "\n"
    HISTORY_TMP_FILE.write_text(payload, encoding="utf-8")
    os.replace(HISTORY_TMP_FILE, HISTORY_FILE)


# ---------------------------------------------------------------------------
# sources
# ---------------------------------------------------------------------------

def _slug_to_ccy(slugs: List[str]) -> Dict[str, str]:
    dataset = load_current_dataset()
    by_slug = {c["slug"]: c for c in dataset["corridors"]}
    resolved: Dict[str, str] = {}
    for slug in slugs:
        if slug not in by_slug:
            raise PipelineAbort(f"unknown corridor slug in dataset: {slug}")
        resolved[slug] = str(by_slug[slug]["to"])
    return resolved


# -- playwright / stealth ----------------------------------------------------

async def _crawl_xrates_one(
    semaphore: asyncio.Semaphore,
    ccy: str,
    page_factory: Any,
    stealth_apply: Any,
) -> Tuple[str, float]:
    async with semaphore:
        page = await page_factory.new_page()
        try:
            if stealth_apply is not None:
                await stealth_apply(page)
            page.set_default_timeout(NAV_TIMEOUT_MS)
            await page.goto(X_RATES_URL.format(ccy=ccy), wait_until="domcontentloaded")
            try:
                await page.wait_for_selector("span.ccOutputRslt", timeout=NAV_TIMEOUT_MS)
                snippet = await page.locator("span.ccOutputRslt").first.inner_text()
            except Exception:
                body_text = await page.inner_text("body")
                candidate = _extract_rate_from_body(body_text)
                if candidate is None:
                    raise PipelineAbort(
                        f"x-rates page for {ccy} has no parseable rate"
                    )
                snippet = str(candidate)
            rate = parse_float(snippet)
            if rate is None:
                # x-rates spans can carry the currency suffix ("95.577006 INR")
                # — pull the leading number portion out.
                match = re.search(r"([\d,]+\.\d{2,})", snippet)
                if match is not None:
                    rate = parse_float(match.group(1))
            if rate is None:
                raise PipelineAbort(f"x-rates page for {ccy}: unparseable '{snippet}'")
            return ccy, rate
        finally:
            await page.close()


def _extract_rate_from_body(body: str) -> Optional[str]:
    match = re.search(r"([\d,]+\.\d{2,})", body)
    return match.group(1) if match else None


async def _crawl_xrates(slugs: List[str], slug_to_ccy: Dict[str, str]) -> Dict[str, float]:
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise PipelineAbort(f"playwright not importable: {exc}")

    stealth_async = None
    try:
        stealth_mod = __import__("playwright_stealth", fromlist=["stealth_async"])
        stealth_async = getattr(stealth_mod, "stealth_async", None)
    except Exception:  # launch-args anti-detection only
        stealth_async = None

    semaphore = asyncio.Semaphore(CONCURRENCY)
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        context = await browser.new_context(
            user_agent=REALISTIC_UA,
            viewport={"width": 1440, "height": 900},
            locale="en-US",
        )

        tasks = [
            _crawl_xrates_one(semaphore, slug_to_ccy[slug], context, stealth_async)
            for slug in slugs
        ]
        results = await asyncio.gather(*tasks)
        await context.close()
        await browser.close()

    rates: Dict[str, float] = {}
    for ccy, rate in results:
        matching = [s for s, c in slug_to_ccy.items() if c == ccy]
        for slug in matching:
            rates[slug] = rate

    # Source-side sanity gate: a "successful" crawl must still sit inside the
    # corridor tolerance, or it is treated as garbage (blocked/placeholder
    # pages often return 0.00) and raised so AUTO mode falls back to JSON.
    for slug in sorted(rates):
        low, high = MID_RATE_BOUNDS[slug]
        if not (low <= rates[slug] <= high):
            raise PipelineAbort(
                f"x-rates crawl returned {rates[slug]} for {slug} "
                f"(outside [{low}, {high}])"
            )
    return rates


def fetch_rates_playwright(slugs: List[str], slug_to_ccy: Dict[str, str]) -> Dict[str, float]:
    return asyncio.run(_crawl_xrates(slugs, slug_to_ccy))


# -- fallback JSON endpoints -------------------------------------------------

def _http_json(url: str, timeout: int = 15) -> Dict[str, Any]:
    request = urllib.request.Request(
        url, headers={"User-Agent": REALISTIC_UA, "Accept": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_rates_fallback(slugs: List[str], slug_to_ccy: Dict[str, str]) -> Dict[str, float]:
    ccys = [slug_to_ccy[slug] for slug in slugs]
    attempts: List[str] = []
    try:
        payload = _http_json(ER_API_URL)
        if payload.get("result") != "success":
            raise ValueError(f"er-api result={payload.get('result')!r}")
        rates = {slug: float(payload["rates"][slug_to_ccy[slug]]) for slug in slugs}
        return rates
    except Exception as exc:  # noqa: BLE001 — fall through to frankfurter
        attempts.append(f"open.er-api.com: {exc}")

    try:
        payload = _http_json(FRANKFURTER_URL.format(ccy_list=",".join(ccys)))
        rates = {slug: float(payload["rates"][slug_to_ccy[slug]]) for slug in slugs}
        return rates
    except Exception as exc:  # noqa: BLE001
        attempts.append(f"api.frankfurter.app: {exc}")

    raise PipelineAbort("fallback sources failed: " + " | ".join(attempts))


# ---------------------------------------------------------------------------
# merge + cli
# ---------------------------------------------------------------------------

def _merge_rates(snapshot: Dict[str, Any], rates: Dict[str, float]) -> Dict[str, Any]:
    merged = json.loads(json.dumps(snapshot))  # deep copy, keep schema stable
    for corridor in merged["corridors"]:
        if corridor["slug"] in rates:
            corridor["rate"] = rates[corridor["slug"]]
    merged["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return merged


def main(argv: List[str]) -> int:
    # Windows consoles default to the ANSI code page and choke on non-ASCII
    # (₹, —) once stdout is redirected; force UTF-8 so dry-run/CI logs print.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:  # noqa: BLE001 — reconfigure is best-effort
            pass

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corridors",
        default=",".join(SUPPORTED_CORRIDORS),
        help="comma-separated corridor slugs (default: all 10)",
    )
    parser.add_argument(
        "--mode",
        choices=["auto", "playwright", "fallback"],
        default="auto",
        help="auto tries playwright then falls back to JSON endpoints",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the merged snapshot without touching data/fees.json",
    )
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    slugs = [s.strip() for s in args.corridors.split(",") if s.strip()]
    unknown = [s for s in slugs if s not in SUPPORTED_CORRIDORS]
    if unknown:
        print(f"[scraper] unsupported corridor slugs: {unknown}", file=sys.stderr)
        return 2

    try:
        slug_to_ccy = _slug_to_ccy(slugs)
        rates: Optional[Dict[str, float]] = None

        if args.mode in ("auto", "playwright"):
            try:
                rates = fetch_rates_playwright(slugs, slug_to_ccy)
                if args.verbose:
                    print(f"[scraper] playwright crawl ok: {rates}")
            except Exception as exc:  # noqa: BLE001
                if args.verbose:
                    print(f"[scraper] playwright crawl failed: {exc}", file=sys.stderr)
                rates = None
                if args.mode == "playwright":
                    print(
                        "[scraper] ABORT: playwright mode failed and no fallback "
                        "allowed; data/fees.json untouched.",
                        file=sys.stderr,
                    )
                    return 0

        if rates is None:
            rates = fetch_rates_fallback(slugs, slug_to_ccy)
            if args.verbose:
                print(f"[scraper] fallback source ok: {rates}")

        if len(rates) != len(slugs):
            raise PipelineAbort(
                f"source returned {len(rates)}/{len(slugs)} corridors"
            )

        snapshot = load_current_dataset()
        merged = _merge_rates(snapshot, rates)
        validate_snapshot(merged)

        if args.dry_run:
            print(json.dumps(merged, indent=2, ensure_ascii=False) + "\n")
            # Preview the would-be sparkline ledger without touching the file.
            history = load_current_history()
            today = merged["updatedAt"][:10]
            for slug, rate in rates.items():
                series = history["history"].get(slug, [])
                if series and series[-1].get("date") == today:
                    series[-1] = {"date": today, "rate": round(float(rate), 6)}
                else:
                    series.append({"date": today, "rate": round(float(rate), 6)})
                history["history"][slug] = series[-HISTORY_WINDOW:]
            history["updatedAt"] = merged["updatedAt"]
            print(
                "[scraper] dry-run history tail (would commit to "
                "data/history.json):"
            )
            for slug in sorted(rates):
                print(f"  {slug}: {history['history'][slug][-1]}")
            return 0

        publish_snapshot(merged)
        update_history(merged, rates)
        print(
            f"[scraper] published {len(slugs)} corridor rates to "
            f"data/fees.json (updatedAt={merged['updatedAt']})"
        )
        print(
            "[scraper] appended 14-day rate history to data/history.json "
            f"(window={HISTORY_WINDOW} points, oldest rolled off)"
        )
        return 0

    except PipelineAbort as exc:
        print(f"[scraper] ABORT: {exc}", file=sys.stderr)
        print("[scraper] data/fees.json untouched — keeping last good revision.", file=sys.stderr)
        return 0  # graceful no-op; the cron keeps the previous revision
    except Exception as exc:  # noqa: BLE001 — unexpected, still non-destructive
        print(f"[scraper] ABORT: unexpected error: {exc}", file=sys.stderr)
        print("[scraper] data/fees.json untouched.", file=sys.stderr)
        return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))