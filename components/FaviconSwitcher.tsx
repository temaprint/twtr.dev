"use client";

import { useEffect } from "react";

const ACTIVE = "/favicon.ico";
const PASSIVE = "/favicon-passive-32x32.png";

/**
 * Live tab icon: the black mark while the tab is visible, the inverted
 * (passive) one when it is hidden. Takes over the rel=icon links rendered
 * by metadata — apple-touch-icon and the manifest are left alone.
 */
export function FaviconSwitcher() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "icon";

    const setFavicon = () => {
      const passive = document.hidden;
      document.querySelectorAll("link[rel='icon']").forEach((el) => {
        if (el !== link) el.remove();
      });
      link.href = `${passive ? PASSIVE : ACTIVE}?v=${passive ? "p" : "a"}`;
      if (!link.isConnected) document.head.appendChild(link);
    };

    document.addEventListener("visibilitychange", setFavicon);
    window.addEventListener("focus", setFavicon);
    window.addEventListener("blur", setFavicon);
    setFavicon();

    return () => {
      document.removeEventListener("visibilitychange", setFavicon);
      window.removeEventListener("focus", setFavicon);
      window.removeEventListener("blur", setFavicon);
      link.remove();
    };
  }, []);

  return null;
}
