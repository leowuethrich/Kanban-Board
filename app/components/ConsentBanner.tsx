"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { startAnalytics } from "@/lib/firebase";
import { useMounted } from "@/lib/useMounted";
import { getConsent, setConsent, type ConsentState } from "@/lib/consent";

export function ConsentBanner() {
  const mounted = useMounted();
  const [choice, setChoice] = useState<ConsentState>(() => getConsent());

  // Analytics starten, wenn (bereits oder gerade) zugestimmt.
  useEffect(() => {
    if (choice === "granted") void startAnalytics();
  }, [choice]);

  if (!mounted || choice !== "unset") return null;

  function decide(v: "granted" | "denied") {
    setConsent(v);
    setChoice(v);
  }

  return (
    <div
      role="dialog"
      aria-label="Einwilligung Analyse-Cookies"
      style={{
        position: "fixed",
        left: "var(--space-4)",
        right: "var(--space-4)",
        bottom: "var(--space-4)",
        maxWidth: 560,
        margin: "0 auto",
        zIndex: 100,
        background: "var(--color-surface)",
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        padding: "var(--space-4) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        fontFamily: "var(--font-body)",
        color: "var(--color-text)",
      }}
    >
      <div style={{ fontSize: 14, lineHeight: 1.55 }}>
        Diese Seite nutzt <strong>Firebase Analytics</strong> (Google), um die Nutzung der
        Portfolio-Demo auszuwerten. Dabei werden Daten an Google (auch in die USA) übertragen. Für
        Login und Speicherung notwendige Dienste laufen unabhängig davon. Details in der{" "}
        <Link href="/legal/datenschutz" style={{ color: "var(--color-accent-700)" }}>
          Datenschutzerklärung
        </Link>
        .
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={() => decide("granted")}
          style={{ fontSize: 13, padding: "6px 16px" }}
        >
          Akzeptieren
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => decide("denied")}
          style={{ fontSize: 13, padding: "6px 16px" }}
        >
          Nur Notwendiges
        </button>
      </div>
    </div>
  );
}
