"use client";

// Fängt Render-/Effekt-Fehler unterhalb des Root-Layouts ab. Das Layout selbst
// (inkl. <html>/<body>) bleibt bestehen — für Fehler darin greift global-error.tsx.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In Prod landet das in den Netlify-Function-/Browser-Logs.
    console.error("App-Fehler:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-6)",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        className="card elev-lg"
        style={{
          maxWidth: 420,
          padding: "var(--space-8)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            background: "var(--color-accent-200)",
            color: "var(--color-accent-700)",
            display: "grid",
            placeItems: "center",
            fontSize: 24,
            margin: "0 auto",
          }}
        >
          !
        </div>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: "var(--font-heading-weight)",
            fontSize: 24,
            margin: 0,
          }}
        >
          Etwas ist schiefgelaufen
        </h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "var(--color-neutral-700)" }}>
          Ein unerwarteter Fehler ist aufgetreten. Deine Daten sind gespeichert — versuch es
          erneut oder lade die Seite neu.
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => reset()}>
            Erneut versuchen
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Seite neu laden
          </button>
        </div>
      </div>
    </div>
  );
}
