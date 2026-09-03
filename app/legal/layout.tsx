import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6) var(--space-8)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginBottom: "var(--space-6)",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "var(--color-accent)",
              display: "grid",
              placeItems: "center",
              color: "var(--color-accent-100)",
              fontFamily: "var(--font-heading)",
              fontSize: 17,
            }}
          >
            k
          </div>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>Krumen</span>
          <div style={{ flex: 1 }} />
          <Link
            href="/"
            style={{ fontSize: 14, color: "var(--color-accent-700)", textDecoration: "none" }}
          >
            ← zur App
          </Link>
        </div>

        <article
          style={{
            fontSize: 15,
            lineHeight: 1.65,
          }}
        >
          {children}
        </article>

        <nav
          style={{
            marginTop: "var(--space-8)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--color-divider)",
            display: "flex",
            gap: "var(--space-4)",
            fontSize: 13,
            color: "var(--color-neutral-600)",
          }}
        >
          <Link href="/legal/impressum" style={{ color: "inherit" }}>
            Impressum
          </Link>
          <Link href="/legal/datenschutz" style={{ color: "inherit" }}>
            Datenschutz
          </Link>
          <Link href="/legal/nutzungsbedingungen" style={{ color: "inherit" }}>
            Nutzungsbedingungen
          </Link>
        </nav>
      </div>
    </div>
  );
}
