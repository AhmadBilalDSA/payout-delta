/**
 * PayoutDelta — Phase S3 client-side input sanitization.
 *
 * Zero-dependency TypeScript sanitizers used at the boundary where
 * visitor-entered strings (invoice notes, line-item titles, client / contractor
 * names, addresses and banking particulars) enter draft state or are persisted
 * to localStorage. They strip HTML structure — tags, script/style/iframe
 * blocks, inline event-attribute handlers, `javascript:` / `vbscript:` / `data:`
 * URIs and entity-escaped markup — so the printable sheet and the local wallet
 * can never carry executable content, even if a hostile-value markup string is
 * pasted in or re-hydrated from an older draft.
 *
 * Pure functions and SSR-safe by construction (no `window`, no DOM), so they
 * are safe to import from any module in the static-export graph.
 */

/** Whole content-bearing elements: removed together with everything inside. */
const BLOCK_TAGS =
  /<\/?(?:script|style|iframe|object|embed|svg|math|template|noscript|form|link|meta|base)[^>]*>/gi;

/** Inline event-attribute handlers (`onclick="…"`, `onerror=…`, …). */
const EVENT_ATTRS = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Executable URI schemes used to smuggle code into `href` / `src`. */
const DANGEROUS_URIS =
  /(?:javascript|vbscript|data)\s*:\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Everything else that still looks like a tag (`<p>`, `<img …>`, `</div>`). */
const GENERIC_TAG = /<\/?[a-z][a-z0-9]*\b[^>]*>/gi;

/**
 * Decode the entity spellings that mask markup (`&lt;` / `&gt;` / `&#60;` /
 * `&#x3c;`) before the tag pass, including double-encoded forms
 * (`&amp;lt;` → `&lt;` → `<`) so a paste can never survive as markup.
 */
function decodeMarkupEntities(input: string): string {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*3[9];|&apos;/gi, "'")
    .replace(/&#(?:0*60|0*3[cC]);|&#x0*3[cC];/g, "<")
    .replace(/&#(?:0*62|0*3[eE]);|&#x0*3[eE];/g, ">");
}

/**
 * Strip every HTML/script marker from a user-entered string: content-bearing
 * elements, generic tags, inline event attributes, executable URI schemes,
 * entity-escaped markup and any surviving angle bracket.
 */
export function stripHtml(input: string): string {
  if (typeof input !== "string") return "";
  let out = decodeMarkupEntities(input);
  out = out.replace(BLOCK_TAGS, "").replace(BLOCK_TAGS, "");
  out = out.replace(GENERIC_TAG, "");
  out = out.replace(EVENT_ATTRS, "");
  out = out.replace(DANGEROUS_URIS, "");
  out = out.replace(EVENT_ATTRS, "");
  out = out.replace(/[<>]/g, "");
  out = out.replace(/\u0000/g, "");
  return out;
}

/**
 * Sanitize a user-entered text field and clamp its length. Intended for
 * client names, contractor names, invoice descriptions, addresses and notes
 * before they are saved to draft state or rendered on the printable sheet.
 *
 * Newlines are preserved (the invoice note renders with `whitespace-pre-line`).
 */
export function sanitizeText(input: string, maxLen = 300): string {
  if (typeof input !== "string") return "";
  const limit = Number.isFinite(maxLen) ? Math.max(0, Math.floor(maxLen)) : 300;
  const cleaned = stripHtml(input);
  if (cleaned.length <= limit) return cleaned;
  return cleaned.slice(0, limit).trimEnd();
}