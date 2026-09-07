"use client";

// Letzte Auffanglinie: greift auch für Fehler im Root-Layout. Muss deshalb
// eigenes <html>/<body> mitbringen und kann NICHT auf globals.css / Design-
// Tokens bauen (die kommen aus dem Layout, das hier gerade nicht rendert).

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root-Fehler:", error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#f5ead8",
          color: "#201e1d",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 400,
            padding: 32,
            borderRadius: 20,
            background: "#ebddc5",
            boxShadow: "0 12px 32px rgba(46,43,37,0.22)",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>Etwas ist schiefgelaufen</h2>
          <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.55, color: "#645c50" }}>
            Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
          </p>
          <button
            onClick={() => reset()}
            style={{
              border: 0,
              cursor: "pointer",
              background: "#c67139",
              color: "#f5ead8",
              fontSize: 15,
              padding: "10px 20px",
              borderRadius: 999,
            }}
          >
            Neu laden
          </button>
        </div>
      </body>
    </html>
  );
}
