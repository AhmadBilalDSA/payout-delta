"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const registerWorker = () => {
      navigator.serviceWorker
        .register("/payout-delta/sw.js", { scope: "/payout-delta/" })
        .catch(() => {
          // Graceful fallback with zero console errors if unavailable
        });
    };

    if (document.readyState === "complete") {
      registerWorker();
    } else {
      window.addEventListener("load", registerWorker, { once: true });
    }
  }, []);

  return null;
}
