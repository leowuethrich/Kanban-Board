import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum — Krumen" };

/*
  ▸ VOR DEM ÖFFENTLICHEN BETRIEB AUSFÜLLEN ◂
  Ersetze die [Platzhalter] durch deine echten Angaben. Für eine private
  Portfolio-Demo in der Schweiz genügt eine erreichbare Kontaktmöglichkeit
  (Name + E-Mail). Wohnadresse ist nicht zwingend, eine Kontaktadresse aber
  empfehlenswert.
*/

export default function ImpressumPage() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 32, marginBottom: "var(--space-4)" }}>
        Impressum
      </h1>

      <p>
        Diese Website ist eine nicht-kommerzielle Portfolio-Demo. Betrieben von einer Privatperson.
      </p>

      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginTop: "var(--space-6)" }}>
        Verantwortlich für den Inhalt
      </h2>
      <p>
        [Vor- und Nachname]
        <br />
        [Strasse Nr., falls angegeben]
        <br />
        [PLZ Ort], Schweiz
        <br />
        E-Mail: [deine-kontakt-adresse@example.com]
      </p>

      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginTop: "var(--space-6)" }}>
        Haftungsausschluss
      </h2>
      <p>
        Die Inhalte dieser Demo werden ohne Gewähr bereitgestellt. Für Richtigkeit, Vollständigkeit
        und Aktualität wird keine Haftung übernommen. Die Nutzung erfolgt auf eigenes Risiko. Für
        Inhalte externer Links sind ausschliesslich deren Betreiber verantwortlich.
      </p>

      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginTop: "var(--space-6)" }}>
        Urheberrecht
      </h2>
      <p>
        Das Design basiert auf dem {"„Organic Design System“"} (Design-Handoff, siehe Repository).
        Der übrige Code und die Texte stehen unter dem Urheberrecht des Betreibers.
      </p>

      <p style={{ marginTop: "var(--space-6)", fontSize: 13, color: "var(--color-neutral-600)" }}>
        Stand: {new Date().getFullYear()}
      </p>
    </>
  );
}
