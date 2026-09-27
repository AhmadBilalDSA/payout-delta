"use client";

import { useEffect } from "react";

/**
 * PayoutDelta — production-only service worker registration (Phase 6).
 *
 * The whole offline shell is one line of registration, so this component owns
 * exactly that: no Workbox, no queue, no runtime dependency. `public/sw.js` is
 * the engine and this is the ignition.
 *
 * WHY PRODUCTION ONLY
 * `next dev` serves stale module bundles from a service worker's HTTP cache,
 * which is precisely the failure mode that makes developers delete an offline
 * feature rather than fix it. Development therefore runs un-cached and
 * deterministic; only the exported artifact that is actually deployed gets the
 * offline shell. The guard is on the *compiled* flag, not on `process.env.NODE_ENV`
 * read at module scope, so a client island never leaks a dev branch into the
 * prerendered HTML.
 *
 * WHY `load`, NOT `DOMContentLoaded`
 * The worker competes with the page's own subresources for bandwidth during
 * parse. Registering on `load` yields the critical path to the document first
 * and only then spends a few hundred kilobytes on precache — the difference is
 * visible on the mobile connections this corpus is mostly read on.
 *
 * WHY THE REGISTRATION IS IDEMPOTENT AND SILENT
 * `register()` is idempotent per scope, but an already-registered worker must
 * be *updated* to a new `sw.js`, or a version bump never reaches a returning
 * reader. That is what `updateViaCache: "none"` and the explicit `update()`
 * are for. Every failure path is swallowed: a service worker that fails to
 * register costs a reader nothing (the site works), and an unhandled rejection
 * in a bootstrap that owns no user-visible state costs them a console error.
 */
export default function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Gate on a same-origin secure context. `navigator.serviceWorker` exists on
    // `http://localhost` (treated as secure) but registration is rejected on any
    // other plain-http origin, and an unhandled rejection there would be noise
    // on every page load of a locally-served preview.
    if (typeof window !== "undefined" && !window.isSecureContext) return;

    const register = () => {
      navigator.serviceWorker
        .register("/payout-delta/sw.js", { scope: "/payout-delta/", updateViaCache: "none" })
        .then((registration) => {
          // Force a re-fetch of sw.js so a new VERSION reaches a reader who
          // already has an older worker installed. Without this, the previous
          // worker keeps serving the previous cache until its own 24h
          // freshness window elapses.
          registration.update().catch(() => undefined);
        })
        .catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
