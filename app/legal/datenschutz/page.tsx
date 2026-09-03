import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutzerklärung — Krumen" };

/*
  ▸ VOR DEM ÖFFENTLICHEN BETRIEB PRÜFEN ◂
  Dieser Text ist auf die tatsächlich eingesetzten Dienste zugeschnitten
  (Firebase Auth, Cloud Firestore, Firebase Analytics, Google Gemini API,
  Netlify-Hosting). Ersetze [Platzhalter] und die Kontakt-E-Mail. Das ist
  eine Vorlage, keine Rechtsberatung — bei Unsicherheit prüfen lassen.
*/

const h2 = {
  fontFamily: "var(--font-heading)",
  fontSize: 20,
  marginTop: "var(--space-6)",
  marginBottom: "var(--space-2)",
} as const;

export default function DatenschutzPage() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 32, marginBottom: "var(--space-4)" }}>
        Datenschutzerklärung
      </h1>

      <p>
        Diese Erklärung informiert über die Bearbeitung von Personendaten bei der Nutzung dieser
        Portfolio-Demo (nachfolgend {"„die Anwendung“"}), gemäss dem Schweizer Datenschutzgesetz
        (revDSG).
        Nutzende ausserhalb der Schweiz beachten bitte, dass für sie ggf. weitergehende Rechte nach
        der DSGVO bestehen.
      </p>

      <h2 style={h2}>Verantwortliche Person</h2>
      <p>
        [Vor- und Nachname], [PLZ Ort], Schweiz. Kontakt: [deine-kontakt-adresse@example.com].
        Siehe auch das <a href="/legal/impressum">Impressum</a>.
      </p>

      <h2 style={h2}>Welche Daten bearbeitet werden</h2>
      <ul style={{ paddingLeft: "1.2em" }}>
        <li>
          <strong>Konto:</strong> E-Mail-Adresse und Passwort (bei der Registrierung). Das Passwort
          wird ausschliesslich von Firebase Authentication gespeichert, nicht im Klartext.
        </li>
        <li>
          <strong>Board-Inhalte:</strong> die von dir erstellten User Stories, Tasks, Kommentare und
          der Chat-Verlauf mit dem Assistenten. Gespeichert in Cloud Firestore, zugänglich nur für
          dein eigenes Konto.
        </li>
        <li>
          <strong>Nutzungszähler:</strong> Anzahl der Assistenten-Aufrufe pro Tag und Konto
          (technisch nötig für das Limit gegen Missbrauch).
        </li>
        <li>
          <strong>Analyse (nur mit Einwilligung):</strong> Firebase Analytics erfasst
          pseudonymisierte Nutzungsdaten (u. a. Geräte-/Browser-Typ, ungefähre Region, aufgerufene
          Ansichten). Wird erst nach aktiver Zustimmung im Cookie-Hinweis geladen.
        </li>
        <li>
          <strong>Server-/Zugriffsdaten:</strong> Der Hoster (Netlify) und Google verarbeiten
          technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, angefragte Ressource).
        </li>
      </ul>

      <h2 style={h2}>Zwecke und Rechtsgrundlagen</h2>
      <ul style={{ paddingLeft: "1.2em" }}>
        <li>
          Bereitstellung der Anwendung, Anmeldung und Speicherung deiner Inhalte — zur Erfüllung des
          mit dir eingegangenen Nutzungsverhältnisses.
        </li>
        <li>Begrenzung der Assistenten-Nutzung — berechtigtes Interesse am Schutz vor Missbrauch und Kosten.</li>
        <li>Analyse der Nutzung — ausschliesslich auf Grundlage deiner Einwilligung, jederzeit widerrufbar.</li>
      </ul>

      <h2 style={h2}>Der KI-Assistent</h2>
      <p>
        Wenn du den Assistenten nutzt, wird der Inhalt deiner Anfrage zusammen mit dem aktuellen
        Board-Kontext (Titel, Beschreibungen, Akzeptanzkriterien deiner Stories und Tasks sowie der
        bisherige Gesprächsverlauf) an die <strong>Google Gemini API</strong> übermittelt und dort
        verarbeitet, um eine Antwort zu erzeugen. Gib dort keine sensiblen oder echten
        vertraulichen Projektdaten ein. Es werden keine Anfragen ohne dein Zutun ausgelöst.
      </p>

      <h2 style={h2}>Auftragsbearbeiter und Drittländer</h2>
      <ul style={{ paddingLeft: "1.2em" }}>
        <li>
          <strong>Google (Firebase Authentication, Cloud Firestore, Firebase Analytics, Gemini
          API)</strong> — Google LLC / Google Ireland Ltd. Datenbearbeitung u. a. in den USA.
        </li>
        <li>
          <strong>Netlify</strong> — Hosting der Anwendung; Netlify, Inc., USA.
        </li>
      </ul>
      <p>
        Bei der Übermittlung in die USA und andere Drittländer stützen sich die Anbieter auf
        Standardvertragsklauseln bzw. anerkannte Angemessenheitsmechanismen. Ein dem Schweizer Recht
        gleichwertiger Schutz kann nicht in jedem Fall garantiert werden.
      </p>

      <h2 style={h2}>Speicherdauer</h2>
      <p>
        Kontodaten und Board-Inhalte werden gespeichert, bis du dein Konto oder die betreffenden
        Inhalte löschst, oder bis der Betreiber die Demo einstellt bzw. inaktive Konten aufräumt.
        Analyse-Daten werden gemäss den Voreinstellungen von Firebase Analytics aufbewahrt (i. d. R.
        bis zu 14 Monate).
      </p>

      <h2 style={h2}>Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung und Herausgabe deiner Daten sowie auf
        Widerruf einer erteilten Einwilligung. Die Analyse-Einwilligung kannst du widerrufen, indem
        du im Browser die gespeicherte Auswahl löschst (Website-Daten für diese Seite entfernen);
        beim nächsten Besuch erscheint der Hinweis erneut. Zur Ausübung deiner Rechte wende dich an
        [deine-kontakt-adresse@example.com]. Du kannst dich zudem beim Eidgenössischen
        Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.
      </p>

      <h2 style={h2}>Konto und Daten löschen</h2>
      <p>
        Schreib eine E-Mail an [deine-kontakt-adresse@example.com]. Dein Firebase-Auth-Konto und dein
        Board-Dokument werden dann entfernt.
      </p>

      <p style={{ marginTop: "var(--space-6)", fontSize: 13, color: "var(--color-neutral-600)" }}>
        Stand: {new Date().getFullYear()}
      </p>
    </>
  );
}
