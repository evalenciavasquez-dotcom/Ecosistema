"use client";

import { useEffect } from "react";

export default function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker la app sigue funcionando; solo pierde instalabilidad.
      });
    }
  }, []);
  return null;
}
