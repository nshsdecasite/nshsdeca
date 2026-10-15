"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageGhost, rememberGhostPath } from "@/components/deca/page-ghost";

const HOLD_MS = 0;

function isNavigationClick(event: MouseEvent) {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/** Ghost placeholders from the click until the next page is on screen. */
export function RouteGhost({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState(0);
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isNavigationClick(event)) return;
      const anchor = (event.target as Element).closest("a");
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      rememberGhostPath(url.pathname);
      setPath(url.pathname);
      setTrip((current) => current + 1);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (trip === 0) return;
    const startedAt = Date.now();
    const startedUrl = window.location.pathname + window.location.search;
    const timer = window.setInterval(() => {
      const arrived = window.location.pathname + window.location.search !== startedUrl;
      const elapsed = Date.now() - startedAt;
      if ((arrived && elapsed >= HOLD_MS) || elapsed >= 8000) {
        rememberGhostPath(null);
        setPath(null);
        setTrip(0);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [trip]);

  if (path) return <PageGhost path={path} />;
  return children;
}
