export function SiteFooter() {
  return (
    <footer
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        flexWrap: "wrap",
        padding: "var(--space-2) var(--space-6)",
        borderTop: "1px solid var(--color-divider)",
        background: "var(--color-bg)",
        fontFamily: "var(--font-body)",
        fontSize: 12.5,
        color: "var(--color-neutral-600)",
      }}
    >
      <span>© {new Date().getFullYear()} Leo Wüthrich</span>
      <span aria-hidden>·</span>
      <a href="/legal/impressum" style={{ color: "inherit", textDecoration: "none" }}>
        Impressum
      </a>
      <span aria-hidden>·</span>
      <a href="/legal/datenschutz" style={{ color: "inherit", textDecoration: "none" }}>
        Datenschutz
      </a>
      <span aria-hidden>·</span>
      <a href="/legal/nutzungsbedingungen" style={{ color: "inherit", textDecoration: "none" }}>
        Nutzungsbedingungen
      </a>
      <span style={{ flex: 1 }} />
      <span>Portfolio-Demo — keine echten Daten eingeben.</span>
    </footer>
  );
}
