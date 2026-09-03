import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * true erst nach dem Client-Mount, false im SSR und beim ersten Client-Render.
 * Über useSyncExternalStore, damit kein setState-in-Effect nötig ist und keine
 * Hydration-Diskrepanz entsteht.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
