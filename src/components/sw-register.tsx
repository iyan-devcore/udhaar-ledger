"use client";

import { useEffect } from "react";

/** Registers the service worker that caches the app shell (production only). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the app works without it, just a little slower to open.
    });
  }, []);
  return null;
}
