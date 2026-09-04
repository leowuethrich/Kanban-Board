import { useSyncExternalStore } from "react";

/**
 * Reaktiver Media-Query-Match. Über useSyncExternalStore, damit kein
 * setState-in-Effect nötig ist und SSR sauber `false` liefert (Server kennt
 * keine Viewport-Breite — mobiles Layout wird erst nach dem Mount aktiv).
 *
 *   const isMobile = useMediaQuery("(max-width: 820px)");
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** Breakpoint der ganzen App: darunter gilt „Handy/schmales Tablet". */
export const MOBILE_QUERY = "(max-width: 820px)";
