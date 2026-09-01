"use client";

import { useEffect } from "react";

/** Registers the service worker (production builds only). */
export function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW is a progressive enhancement — ignore failures silently.
      });
    }
  }, []);

  return null;
}
