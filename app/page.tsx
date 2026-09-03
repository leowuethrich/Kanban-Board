"use client";

import { useMounted } from "@/lib/useMounted";
import { App } from "./components/App";

export default function Page() {
  // Bis zum Client-Mount nichts rendern: die App liest localStorage in ihren
  // Lazy-Initializern, das muss auf dem Client passieren (keine SSR-Diskrepanz).
  const mounted = useMounted();
  if (!mounted) return null;
  return <App />;
}
