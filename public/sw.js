/* eslint-disable */
/**
 * PayoutDelta — offline registry shell (Phase 6).
 *
 * ZERO DEPENDENCY BY CONSTRUCTION. Plain ES5-compatible JavaScript, no build
 * step, no Workbox, no import map, no runtime npm package. This file is
 * published verbatim from `public/` into `out/sw.js` and registered by
 * `components/ServiceWorkerBootstrap.tsx` in production builds only.
 *
 * WHAT IT DOES AND — MORE IMPORTANT — WHAT IT DOES NOT DO
 * The site's own records (corridor fees, statutory regimes, rails, bank heads)
 * are prerendered into static HTML, so the pages themselves already work
 * offline the moment a navigation has been visited once. What a reader cannot
 * get offline is the *data* behind them: the four registry feeds that power the
 * client islands' live quotes, the clearing terminal and the statutory wizard.
 * So this worker precaches those four JSON registries and serves them
 * cache-first, and it does **not** touch anything else.
 *
 * Three rules, each load-bearing:
 *   1. Only the precache manifest is ever cached. A runtime cache-everything
 *      "offline app" shell on a 353-page static export would evict the
 *      registries the moment a reader browsed, and stale fee data in a
 *      financial tool is worse than no offline mode at all.
 *   2. Navigations are never intercepted. A request handler that rewrites a
 *      document request risks serving a stale HTML shell under a URL whose
 *      data has since changed. The browser's own HTTP cache already handles
 *      documents better than anything hand-rolled here.
 *   3. Every other request falls through untouched — no respondWith, so the
 *      worker cannot become a single point of failure for the whole site. A
 *      throw inside this file must degrade to "no offline cache", never to a
 *      blank page.
 *
 * SCOPE. The script is served from `<basePath>/sw.js` (`/payout-delta/sw.js`),
 * so its default scope is `/payout-delta/` — exactly the deployment, and not
 * the origin root. It cannot see, and never touches, anything hosted alongside
 * this project on `ahmadbilaldsa.github.io`.
 */

(function () {
  "use strict";

  /** Deployment prefix. Mirrors `basePath` in next.config; do not drift. */
  var BASE = "/payout-delta";

  /**
   * Bump on any change to the precache list or to a registry's shape. The cache
   * name is the version, so a bump evicts the previous cache atomically on
   * activate and readers never get a half-old, half-new registry set.
   */
  var VERSION = "v1";

  var CACHE_NAME = "payoutdelta-registries-" + VERSION;

  /**
   * The four registries, at the paths the static export actually serves.
   *
   * These are `public/api/*` mirrors of `data/*` produced by
   * `scripts/sync_api_feed.mjs`. The `data/` source paths are *not* here on
   * purpose: they are build inputs, never copied into `out/`, and listing them
   * would make every precache entry a 404 that fails installation.
   */
  var REGISTRIES = [
    BASE + "/api/fees.json",
    BASE + "/api/jurisdictions.json",
    BASE + "/api/rails.json",
    BASE + "/api/banksRegistry.json",
  ];

  self.addEventListener("install", function (event) {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(function (cache) {
          // `reload` bypasses the HTTP cache: a precache that installs from a
          // stale HTTP-cached copy would pin a bad dataset into the offline
          // cache for the next reader. Each entry is added individually so one
          // unreachable registry cannot abort the whole install.
          return Promise.all(
            REGISTRIES.map(function (url) {
              return cache
                .add(new Request(url, { cache: "reload" }))
                .catch(function (error) {
                  // Reported, not thrown: a missing registry degrades that one
                  // dataset to online-only and must not take the other three
                  // down with it.
                  console.warn("[sw] precache skipped", url, error);
                });
            })
          );
        })
        .then(function () {
          return self.skipWaiting();
        })
    );
  });

  self.addEventListener("activate", function (event) {
    event.waitUntil(
      caches
        .keys()
        .then(function (keys) {
          return Promise.all(
            keys.map(function (key) {
              if (key !== CACHE_NAME && key.indexOf("payoutdelta-registries-") === 0) {
                return caches.delete(key);
              }
              return undefined;
            })
          );
        })
        .then(function () {
          return self.clients.claim();
        })
    );
  });

  self.addEventListener("fetch", function (event) {
    var request = event.request;

    // Rule 3: nothing but a precached registry GET is ever handled. Anything
    // else — documents, scripts, styles, images, cross-origin calls, non-GET —
    // returns without calling respondWith and so bypasses this worker entirely.
    if (request.method !== "GET") return;

    var url;
    try {
      url = new URL(request.url);
    } catch (error) {
      return;
    }

    if (url.origin !== self.location.origin) return;
    if (REGISTRIES.indexOf(url.pathname) === -1) return;

    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request)
          .then(function (response) {
            // Only a complete, same-origin, basic response is worth storing. An
            // opaque or error response cached under the registry's URL would
            // make the offline shell serve a failure as if it were data.
            if (response && response.status === 200 && response.type === "basic") {
              var copy = response.clone();
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(request, copy);
              });
            }
            return response;
          })
          .catch(function () {
            // Offline and uncached. Returning a shaped JSON error rather than
            // an opaque network failure keeps every consumer's
            // `.json().then(...)` path from throwing an unhandled rejection.
            return new Response(
              JSON.stringify({
                error: "offline",
                source: "payoutdelta-service-worker",
                path: url.pathname,
                message:
                  "This registry is not in the offline cache yet. Reconnect once to seed it.",
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }
            );
          });
      })
    );
  });
})();
