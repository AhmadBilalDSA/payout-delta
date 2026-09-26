/**
 * PayoutDelta — Phase S3 Privacy Guard.
 *
 * The single registry for every browser-storage key in the app. All keys live
 * under the `payoutdelta:*` namespace — the invoice draft, the year-end tax
 * ledger, the rate-alert watchlist, PRC letter shells, contract-addendum
 * forms, the calculator → studio sync payload, the theme and the language
 * preference — so a complete local wipe is one deterministic pass over
 * `localStorage`.
 *
 * Two operations back the "zero-trace" promise:
 *
 *  • `migrateLegacyStorage()` — a one-time (per session) self-heal that lifts
 *    any pre-namespace key (`payoutdelta_draft_invoice`,
 *    `payoutdelta_banksync`, `payoutdelta:remittance_ledger`,
 *    `payoutdelta_prc_letter_*`, `payoutdelta-theme`, `payoutdelta_lang`) into
 *    its canonical `payoutdelta:*` key without dropping a byte of data.
 *
 *  • `purgeAllLocalData()` — removes EVERY key the app owns (namespaced and
 *    legacy spellings) plus the per-session advisory-card dismiss marker, so a
 *    visitor can wipe all financial drafts, the ledger, letter shells and the
 *    watchlist from this browser in one click.
 *
 * Every read/write funnels through the guarded `readLocalStorage` /
 * `writeLocalStorage` / `removeLocalStorage` wrappers below, so the legacy
 * migration always runs before any access and old-format data is transparently
 * upgraded. All APIs are `window`-guarded and no-throw, keeping this module
 * importable during the static-export prerender.
 */

export const NAMESPACE_PREFIX = "payoutdelta:";

/**
 * Canonical `payoutdelta:*` storage keys — the only keys the app writes.
 * Keeping them in one object makes the namespace auditable at a glance.
 */
export const STORAGE_KEYS = {
  invoiceDraft: `${NAMESPACE_PREFIX}invoice_draft`,
  bankSync: `${NAMESPACE_PREFIX}bank_sync`,
  invoiceSync: `${NAMESPACE_PREFIX}invoice_sync`,
  taxLedger: `${NAMESPACE_PREFIX}tax_ledger`,
  rateAlerts: `${NAMESPACE_PREFIX}rate_alerts`,
  prcLetterPrefix: `${NAMESPACE_PREFIX}prc_letter_`,
  addendumForm: `${NAMESPACE_PREFIX}addendum_form`,
  whatsappDismiss: `${NAMESPACE_PREFIX}whatsapp_consulting_dismissed`,
  theme: `${NAMESPACE_PREFIX}theme`,
  language: `${NAMESPACE_PREFIX}language`,
  baseCurrency: `${NAMESPACE_PREFIX}base_currency`,
} as const;

/** Individual aliases so call sites read naturally. */
export const INVOICE_DRAFT_KEY = STORAGE_KEYS.invoiceDraft;
export const BANK_SYNC_KEY = STORAGE_KEYS.bankSync;
export const INVOICE_SYNC_KEY = STORAGE_KEYS.invoiceSync;
export const TAX_LEDGER_KEY = STORAGE_KEYS.taxLedger;
export const RATE_ALERTS_KEY = STORAGE_KEYS.rateAlerts;
export const PRC_LETTER_PREFIX = STORAGE_KEYS.prcLetterPrefix;
export const ADDENDUM_FORM_KEY = STORAGE_KEYS.addendumForm;
export const WHATSAPP_DISMISS_KEY = STORAGE_KEYS.whatsappDismiss;
export const THEME_KEY = STORAGE_KEYS.theme;
export const LANGUAGE_KEY = STORAGE_KEYS.language;
export const BASE_CURRENCY_KEY = STORAGE_KEYS.baseCurrency;

/** Every key under management — handy for audits and tests. */
export const APP_STORAGE_KEYS: readonly string[] = Object.values(STORAGE_KEYS);

/** Exact legacy-key aliases → canonical key (one-time migration). */
const LEGACY_KEY_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ["payoutdelta_draft_invoice", INVOICE_DRAFT_KEY],
  ["payoutdelta_banksync", BANK_SYNC_KEY],
  ["payoutdelta:remittance_ledger", TAX_LEDGER_KEY],
  ["payoutdelta-theme", THEME_KEY],
  ["payoutdelta_lang", LANGUAGE_KEY],
];

/** Per-slug legacy prefixes → canonical prefix (PRC letter shells). */
const LEGACY_PREFIX_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ["payoutdelta_prc_letter_", PRC_LETTER_PREFIX],
];

/** A key is app-owned when it carries any historical `payoutdelta` spelling. */
export function isAppStorageKey(key: string): boolean {
  return key.startsWith("payoutdelta");
}

function remapLegacyKey(key: string): string | null {
  for (const [legacy, target] of LEGACY_KEY_ALIASES) {
    if (key === legacy) return target;
  }
  for (const [legacyPrefix, targetPrefix] of LEGACY_PREFIX_ALIASES) {
    if (key.startsWith(legacyPrefix)) {
      return `${targetPrefix}${key.slice(legacyPrefix.length)}`;
    }
  }
  return null;
}

let migrationRan = false;

/**
 * One-time, per-session upgrade of any pre-namespace keys into their canonical
 * `payoutdelta:*` home. Never overwrites newer data; always removes the old
 * spelling once copied.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === "undefined" || migrationRan) return;
  migrationRan = true;
  try {
    const store = window.localStorage;
    const legacyKeys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key !== null) legacyKeys.push(key);
    }
    for (const key of legacyKeys) {
      if (!isAppStorageKey(key) || key.startsWith(NAMESPACE_PREFIX)) continue;
      const target = remapLegacyKey(key);
      if (target === null || target === key) continue;
      const raw = store.getItem(key);
      if (raw === null) continue;
      if (store.getItem(target) === null) {
        store.setItem(target, raw);
      }
      store.removeItem(key);
    }
  } catch {
    // Storage blocked (private browsing) — legacy keys simply stay; every
    // subsequent read still works because the reads are namespace-aware.
  }
}

/** Guarded, migration-aware localStorage getter. Never throws. */
export function readLocalStorage(key: string): string | null {
  migrateLegacyStorage();
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Guarded, migration-aware localStorage setter. Never throws. */
export function writeLocalStorage(key: string, value: string): boolean {
  migrateLegacyStorage();
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Guarded, migration-aware localStorage remover. Never throws. */
export function removeLocalStorage(key: string): void {
  migrateLegacyStorage();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Zero-trace local wipe. Removes every key the app owns — canonical
 * `payoutdelta:*` keys AND any surviving legacy spelling — plus the per-session
 * WhatsApp advisory-card dismiss marker. Returns the number of keys removed so
 * callers can surface precise confirmation copy.
 */
export function purgeAllLocalData(): number {
  if (typeof window === "undefined") return 0;
  let cleared = 0;
  try {
    const store = window.localStorage;
    const ownedKeys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key !== null && isAppStorageKey(key)) ownedKeys.push(key);
    }
    for (const key of ownedKeys) {
      store.removeItem(key);
      cleared += 1;
    }
    try {
      window.sessionStorage.removeItem(WHATSAPP_DISMISS_KEY);
    } catch {
      // ignore
    }
  } catch {
    // Storage unavailable — nothing to clear.
  }
  return cleared;
}