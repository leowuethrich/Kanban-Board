import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nutzungsbedingungen — Krumen" };

const h2 = {
  fontFamily: "var(--font-heading)",
  fontSize: 20,
  marginTop: "var(--space-6)",
  marginBottom: "var(--space-2)",
} as const;

export default function TermsPage() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 32, marginBottom: "var(--space-4)" }}>
        Nutzungsbedingungen
      </h1>

      <p>
        Diese Anwendung ist eine kostenlose, nicht-kommerzielle <strong>Portfolio-Demo</strong>. Mit
        der Registrierung oder Nutzung akzeptierst du die folgenden Bedingungen.
      </p>

      <h2 style={h2}>Zweck und Verfügbarkeit</h2>
      <p>
        Die Demo dient der Veranschaulichung. Es besteht kein Anspruch auf Verfügbarkeit,
        Funktionsfähigkeit, Datenerhalt oder Support. Der Betreiber kann die Demo, einzelne Funktionen
        oder Konten jederzeit und ohne Vorankündigung ändern, einschränken oder einstellen.
      </p>

      <h2 style={h2}>Keine echten oder vertraulichen Daten</h2>
      <p>
        Gib keine echten personenbezogenen, geschäftlichen oder anderweitig vertraulichen Daten ein.
        Inhalte des KI-Assistenten werden zur Verarbeitung an die Google Gemini API übermittelt
        (siehe <a href="/legal/datenschutz">Datenschutzerklärung</a>).
      </p>

      <h2 style={h2}>KI-Ausgaben</h2>
      <p>
        Vom Assistenten erzeugte User Stories, Tasks, Schätzungen und Texte sind maschinell generiert,
        können fehlerhaft oder unpassend sein und werden nicht geprüft. Übernahme in das Board erfolgt
        nur nach deiner ausdrücklichen Bestätigung. Verlass dich nicht ungeprüft auf die Ergebnisse.
      </p>

      <h2 style={h2}>Zulässige Nutzung</h2>
      <p>
        Untersagt sind insbesondere: automatisiertes Massen-Anlegen von Konten oder Anfragen, Umgehen
        der Nutzungslimits, Versuche, fremde Konten oder Daten einzusehen, sowie jede Nutzung, die
        Rechte Dritter verletzt oder unverhältnismässige Kosten verursacht. Der Betreiber darf Konten
        bei Verstoss oder Missbrauchsverdacht sperren oder löschen.
      </p>

      <h2 style={h2}>Haftung</h2>
      <p>
        Die Nutzung erfolgt auf eigenes Risiko. Soweit gesetzlich zulässig, ist jede Haftung des
        Betreibers für Schäden aus der Nutzung oder Nichtverfügbarkeit der Demo, für Datenverlust oder
        für Folgen von KI-Ausgaben ausgeschlossen.
      </p>

      <h2 style={h2}>Änderungen</h2>
      <p>
        Diese Bedingungen können angepasst werden. Massgeblich ist die bei der Nutzung veröffentlichte
        Fassung.
      </p>

      <h2 style={h2}>Anwendbares Recht</h2>
      <p>Es gilt Schweizer Recht, unter Ausschluss der Kollisionsnormen.</p>

      <p style={{ marginTop: "var(--space-6)", fontSize: 13, color: "var(--color-neutral-600)" }}>
        Stand: {new Date().getFullYear()}
      </p>
    </>
  );
}
