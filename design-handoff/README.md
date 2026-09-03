# Handoff: Krumen — Kanban & Projektplanung mit AI-Helfer

## Overview
Ein Web-Tool für Solo-/Freelance-Projektplanung: Login, Kanban-Board mit Drag & Drop, Backlog mit
Priorisierung, User-Story-Editor (Akzeptanzkriterien, Story Points, Kommentare), Sprint-Planung mit
Kapazitätsanzeige und ein AI-Helfer-Panel rechts. Oberfläche komplett auf Deutsch.

## About the Design Files
Die Dateien in diesem Bundle sind **Design-Referenzen in HTML** — ein Prototyp, der Aussehen und
Verhalten zeigt, kein Produktionscode zum Kopieren. Die Aufgabe ist, diese Designs in der
Zielumgebung des Codebases neu zu bauen (React, Vue, SvelteKit, Next.js …) mit deren etablierten
Patterns und Bibliotheken. Existiert noch keine Umgebung: passendes Framework wählen (Empfehlung
unten) und die Designs dort umsetzen.

Der Prototyp nutzt ein internes Template-Format (`.dc.html`). **Nicht** dieses Format nachbauen —
nur Struktur, Styling und Verhalten übernehmen. Die Datei ist gut lesbar: Markup oben, Logik-Klasse
unten im `<script data-dc-script>`-Block.

## Fidelity
**High-fidelity.** Farben, Typografie, Radien, Abstände und Schatten stammen aus dem Organic Design
System (`styles.css`, mitgeliefert) und sind final. UI pixelgenau nachbauen, dabei die Tokens aus
`styles.css` als Quelle der Wahrheit nutzen — keine Hex-Werte hart kodieren, immer `var(--*)`.

## Empfohlener Stack (falls kein Codebase existiert)
- Next.js (App Router) + TypeScript
- Server-State: Postgres via Prisma oder Supabase
- Auth: Auth.js (Credentials + später Magic Link) oder Supabase Auth
- Drag & Drop: `@dnd-kit/core` (nicht HTML5-DnD wie im Prototyp — Touch-Support)
- AI: Anthropic Messages API serverseitig (siehe „AI-Helfer" unten), niemals Key im Client

## Screens / Views

### 1. Login (`screen === "login"`)
**Zweck:** Anmeldung; einzige Seite ohne App-Chrome.
**Layout:** `min-height: 100vh`, CSS-Grid `grid-template-columns: 1.05fr .95fr`.
- **Linke Spalte:** `padding: 72px 64px`, `max-width: 640px`, Flex-Column zentriert, `gap: var(--space-6)`.
  - Logo-Zeile: Kreis 40×40, `border-radius: 999px`, `background: var(--color-accent)`, darin „k" in
    `var(--font-heading)` 20px, Farbe `var(--color-accent-100)`; daneben Wortmarke „Krumen" 22px Heading.
  - H1: `var(--font-heading)` 52px, `line-height: 1.05`, `text-wrap: pretty` —
    „Plane dein Projekt, ohne dich zu verzetteln."
  - Absatz 18px / 1.5, `max-width: 44ch`, `color: var(--color-neutral-700)` —
    „Board, Backlog, User Storys und Sprints an einem Ort — mit einem AI-Helfer, der die Story schreibt, zerlegt und schätzt."
  - Drei Feature-Zeilen 16px, `var(--color-neutral-700)`, Flex-Column `gap: var(--space-2)`:
    „Ein Board pro Projekt, Drag & Drop über fünf Spalten" / „Storys mit Akzeptanzkriterien und Story Points" / „Sprint-Planung mit Kapazitätsanzeige"
- **Rechte Spalte:** `background: var(--color-accent-2-200)`, `display: grid; place-items: center`, `padding: 48px`.
  - Karte: `.card .elev-lg`, `max-width: 380px`, `padding: var(--space-8)`, `border-radius: var(--radius-lg)`, `gap: var(--space-4)`.
  - `.card-kicker` „Willkommen zurück", H2 28px Heading „Anmelden".
  - Zwei `.field` + `.input`: „E-Mail" (`type=email`, Placeholder `du@beispiel.de`), „Passwort" (`type=password`, Placeholder `••••••••`).
  - Fehlerbox (nur bei Fehler): 14px, `color: var(--color-accent-700)`, `background: var(--color-accent-200)`, `padding: var(--space-2) var(--space-3)`, `border-radius: var(--radius-md)`.
  - `.btn.btn-primary.btn-block` — Label „Anmelden", während des Ladens „Einen Moment …".
  - Zwei Links 14px `var(--color-neutral-600)`, `space-between`: „Passwort vergessen?" / „Konto anlegen".
  - Fußnote über `border-top: 1px solid var(--color-divider)`, 13px.
**Validierung (Prototyp):** E-Mail muss „@" enthalten, Passwort ≥ 4 Zeichen; sonst Fehlertext
„Bitte E-Mail und ein Passwort mit vier Zeichen eingeben." Erfolg → 500 ms Delay → App.
**Produktion:** echte Auth ersetzt das; Fehlertexte und Timing-Feeling beibehalten.

### 2. App-Chrome (alle eingeloggten Views)
`height: 100vh`, Flex-Column, `overflow: hidden`.
- **Header `.nav`:** `padding: var(--space-3) var(--space-6)`, Flex-Row, `gap: var(--space-6)`, `flex: none`.
  - `.nav-brand`: Kreis 30×30 accent mit „k" + „Krumen".
  - Tab-Pillgruppe: Container `background: var(--color-neutral-200)`, `padding: 4px`, `border-radius: 999px`.
    Tabs: „Übersicht", „Board", „Backlog", „Sprint". Aktiv: `background: var(--color-accent)`,
    `color: var(--color-accent-100)`, `font-weight: 700`. Inaktiv: transparent, `var(--color-neutral-700)`, 500.
    Padding `7px 16px`, 15px, `border-radius: 999px`, Hover `opacity: .85`.
  - Spacer `flex: 1`, dann Text „Projekt: Krumen Web" 14px `var(--color-neutral-600)`.
  - `.btn.btn-secondary` — Label „Helfer ausblenden" / „AI-Helfer" je nach Panel-Zustand.
  - Avatar-Button 34×34 rund, `background: var(--color-accent-2-500)`, Text `var(--color-accent-2-100)`,
    700/14px, Initialen = erster Buchstabe der E-Mail + „K"; Klick = Logout, `title="Abmelden"`.
- **Body:** Flex-Row, `min-height: 0`; `<main>` `flex: 1`, `overflow: auto`, `padding: var(--space-6)`;
  rechts das AI-Panel (siehe unten).

### 3. Übersicht
- Kicker „Übersicht", H1 40px „Sprint 4 läuft".
- Vier Stat-Karten (`grid-template-columns: repeat(4, 1fr)`, `gap: var(--space-4)`): `.card .elev-sm`,
  `padding: var(--space-4)`, `border-radius: var(--radius-lg)`; Zahl 34px Heading `line-height: 1`,
  Label 14px `var(--color-neutral-700)`. Werte: Anzahl Storys / Summe Story Points / Anzahl „Fertig" /
  Summe offener Akzeptanzkriterien. Labels: „Storys im Projekt", „Story Points gesamt", „fertig", „offene Kriterien".
- Fortschritts-Karte: Titel „Fortschritt" (20px Heading) + rechts „X von Y Punkten erledigt" (14px).
  Balken `height: 14px`, `border-radius: 999px`, Track `var(--color-neutral-300)`, Füllung
  `var(--color-accent)`, `transition: width .4s ease`. Darunter 5 Spalten-Zähler mit
  `border-left: 3px solid var(--color-accent-2-400)`, Label uppercase 13px `letter-spacing: .06em`, Zahl 22px Heading.
- Zwei Karten nebeneinander (`1.2fr 1fr`, `gap: var(--space-4)`), beide `padding: var(--space-6)`, `--radius-lg`:
  - „Epics": pro Epic `.tag` + Balken (`height: 10px`, Füllung `var(--color-accent-2-500)`, Anteil erledigter Storys) + „N von M fertig" (14px, rechtsbündig, `width: 90px`).
  - „Aktivität": Liste mit 8px-Punkt `var(--color-accent)`, Text 15px + „· Zeitangabe" in `var(--color-neutral-600)`.
    Einträge: „KR-3 nach Review verschoben" (gestern), „Helfer hat drei Kriterien zu KR-4 ergänzt" (gestern),
    „KR-2 abgeschlossen" (vor 2 Tagen), „Sprint 4 gestartet" (vor 9 Tagen).

### 4. Board (Default-View)
- Kopfzeile: Kicker „Board", H1 36px „Krumen Web"; rechts `.input` Placeholder „Storys durchsuchen"
  (`max-width: 240px`, filtert live über Titel + Epic, case-insensitive) und `.btn.btn-primary` „Neue Story".
- Spalten-Grid: `repeat(5, minmax(230px, 1fr))`, `gap: var(--space-3)`, `align-items: start`, `overflow-x: auto`.
- **Spalte:** `background: var(--color-neutral-200)`, `border: 2px dashed transparent`,
  `border-radius: var(--radius-lg)`, `padding: var(--space-3)`, `min-height: 220px`,
  `transition: background .15s ease`. **Drop-Ziel aktiv:** `background: var(--color-accent-200)`,
  `border-color: var(--color-accent-500)`.
  - Kopf: Name 16px Heading + Badge „N · P P" (Kartenzahl · Punktesumme) 13px auf
    `var(--color-neutral-200)`, `padding: 2px 10px`, `border-radius: 999px`.
  - Fuß: `.btn.btn-ghost` „+ Karte" → legt Karte in dieser Spalte an und öffnet den Editor.
- **Karte:** `.card`, `padding: var(--space-3)`, `border-radius: var(--radius-md)`,
  `box-shadow: var(--shadow-sm)`, `cursor: grab`, `gap: var(--space-2)`.
  Hover: `box-shadow: var(--shadow-md); transform: translateY(-1px)`. Beim Ziehen: `opacity: .4`.
  Inhalt: Zeile 1 = Epic-`.tag` (11px) + Key „KR-3" (12px, `var(--color-neutral-600)`, `tabular-nums`);
  Zeile 2 = Titel 15px / 1.35, `text-wrap: pretty`; Zeile 3 = Punkte-Pille
  (`background: var(--color-accent-200)`, `color: var(--color-accent-800)`, 700, `padding: 1px 9px`,
  `border-radius: 999px`) + „AK 2/3" + „N Komm." (13px `var(--color-neutral-700)`, `gap: var(--space-3)`).
  Klick öffnet den Story-Editor.

### 5. Backlog
- Kicker „Backlog", H1 36px „Priorisierung"; rechts `.btn.btn-secondary` „Mit AI priorisieren"
  (öffnet Panel + startet Priorisierungs-Antwort) und `.btn.btn-primary` „Neue Story".
- `.table`, `max-width: 1040px`. Spalten: „#" (44px), „Story", „Epic" (130px), „Punkte" (70px),
  „AK" (70px), „Spalte" (120px), „Rang" (96px).
- Story-Zelle = Textbutton (15px, Hover `color: var(--color-accent-700)`) → Editor.
- Rang-Zelle: zwei `.btn.btn-ghost` „↑" / „↓" verschieben die Karte in der globalen Reihenfolge.
- Die Reihenfolge (`order`) ist projektweit und steuert auch die Kartenreihenfolge im Board.

### 6. Sprint
- Kicker „Sprint-Planung", H1 36px „Sprint 5 · zwei Wochen", `max-width: 900px`.
- Kapazitätskarte `.card .elev-sm`, `padding: var(--space-6)`: Zeile „Kapazität" (16px) +
  „X / 21 Punkte" (22px Heading). Balken `height: 16px`, Track `var(--color-neutral-300)`,
  Füllung `var(--color-accent-2-500)`, bei Überbuchung `var(--color-accent-600)`,
  `transition: width .35s ease`, Breite gedeckelt auf 100 %.
  Hinweistext 14px: „Noch N Punkte frei." bzw. „Überbucht um N Punkte — nimm eine Story heraus."
- Story-Zeilen: `.card`, `padding: var(--space-3) var(--space-4)`, `border-radius: var(--radius-md)`,
  **Flex-Row** `align-items: center`, `gap: var(--space-3)`, `box-shadow: var(--shadow-sm)`.
  Inhalt: Toggle-Kreis 26×26 (`border: 2px solid var(--color-accent-500)`, gefüllt
  `var(--color-accent-500)` mit „✓" wenn im Sprint) → Epic-`.tag` → Titel (Textbutton, `flex: 1`) →
  Spaltenname 13px → Punkte-Pille.

### 7. Story-Editor (rechtes Drawer-Panel)
Öffnet über `.dialog-backdrop` (`position: fixed; inset: 0`, `justify-content: flex-end`, `z-index: 40`);
Klick auf den Backdrop schließt, Klick im Panel stoppt Propagation.
Panel: `width: 560px`, `max-width: 92vw`, volle Höhe, `background: var(--color-bg)`,
`box-shadow: var(--shadow-lg)`, `overflow: auto`, `padding: var(--space-8)`, `gap: var(--space-4)`,
Einblenden mit `om-in` (siehe Animationen).
- Kopf: Epic-`.tag`, Key 13px, Spacer, Ghost-Button „✕".
- Titel: `<textarea class="input">`, `var(--font-heading)` 26px / 1.2, `rows=2`, `resize: vertical`.
- Drei Selects nebeneinander (`1fr 1fr 1fr`, `gap: var(--space-3)`): „Story Points" (1, 2, 3, 5, 8, 13),
  „Epic" (Onboarding, Board, AI-Helfer), „Spalte" (die fünf Spalten).
- „User Story": `<textarea class="input">`, `rows=3`, `line-height: 1.5`.
- „Akzeptanzkriterien" (19px Heading) + „N von M erfüllt" (14px) + `.btn.btn-secondary` „AI ergänzen".
  Jedes Kriterium: Zeile auf `var(--color-neutral-100)`, `padding: var(--space-2) var(--space-3)`,
  `border-radius: var(--radius-md)`; Toggle-Kreis 22×22 (`border: 2px solid var(--color-accent-2-500)`,
  gefüllt `var(--color-accent-2-500)` + „✓"); Text 15px / 1.45, erledigt = `line-through` +
  `var(--color-neutral-600)`; Ghost-„✕" entfernt. Darunter `.input` „Kriterium hinzufügen" (Enter oder „+").
- „Kommentare" (19px Heading): Avatar 30×30 rund `var(--color-accent-2-300)`, Initialen 12px/700
  `var(--color-accent-2-800)`; daneben Zeitangabe 12px `var(--color-neutral-600)` über dem Text (14px / 1.5).
  Eingabe `.input` „Kommentar schreiben" + `.btn.btn-secondary` „Senden" (Enter genügt); neuer Kommentar
  bekommt „DU" / „gerade".
- Fuß über `border-top`, `margin-top: auto`: `.btn.btn-primary` „Fertig" und Ghost
  „Story löschen" in `var(--color-accent-700)`.

### 8. AI-Helfer-Panel (rechte Seitenspalte, per Default offen)
`width: 380px`, `flex: none`, `border-left: 1px solid var(--color-divider)`,
`background: var(--color-neutral-100)`, Flex-Column, `min-height: 0`.
- Kopf über `border-bottom`: Kreis 28×28 `var(--color-accent-2-500)` mit „ai" (Heading 14px,
  `var(--color-accent-2-100)`); Titel „Helfer" (17px Heading), Unterzeile „kennt Board, Backlog und Sprint"
  (12px `var(--color-neutral-600)`); Ghost-„✕" schließt.
- Verlauf: `flex: 1`, `overflow: auto`, `padding: var(--space-4)`, `gap: var(--space-3)`.
  Bubble: `max-width: 94%`, `padding: var(--space-3)`, `border-radius: var(--radius-md)`, 14px / 1.5,
  `animation: om-in .25s ease both`. Nutzer: `align-self: flex-end`, `background: var(--color-accent-2-200)`.
  AI: `align-self: flex-start`, `background: var(--color-surface)`.
  Struktur einer AI-Bubble: optionaler Titel (15px Heading), Fließtext (`white-space: pre-wrap`),
  optionale Bullet-Liste (Punkt „·" in `var(--color-accent-700)` + Text), optionaler
  `.btn.btn-primary` (13px, `padding: 5px 14px`) der den Vorschlag ins Board schreibt.
  Ladezustand: Text „denkt nach …" 14px `var(--color-neutral-600)` mit `om-pulse`-Animation.
- Fuß über `border-top`: Quick-Action-Chips (Pill, `border: 1px solid var(--color-accent-2-400)`,
  transparent, `color: var(--color-accent-2-700)`, 12.5px, `padding: 4px 12px`, Hover
  `background: var(--color-accent-2-200)`): „Story schreiben", „Zerlegen", „Schätzen",
  „Priorisieren", „Sprint-Report". Darunter `.input` „Frag den Helfer …" (Enter sendet) +
  `.btn.btn-primary` „↑".
- Startnachricht: „Moin. Ich kenne Board, Backlog und Sprint. Willst du eine Story schreiben, etwas zerlegen oder schätzen?"

## AI-Helfer — Verhalten
Im Prototyp sind die Antworten **fest verdrahtet** mit ~900 ms Denkpause. In der Produktion gegen
echte Modellaufrufe tauschen; die Interaktionsform bleibt:

1. Nutzer löst eine Aktion aus (Chip, Freitext oder „AI ergänzen" im Editor).
2. Panel zeigt „denkt nach …".
3. Antwort erscheint als strukturierte Bubble: Titel, Fließtext, Bullets, **ein** Apply-Button.
4. Apply schreibt real ins Board (neue Story, Kriterien anhängen, Punkte setzen, Reihenfolge ändern) —
   der Vorschlag wird nie automatisch übernommen.

Aktionen und ihre Apply-Wirkung:
| Aktion | Ergebnis | Apply |
| --- | --- | --- |
| Story schreiben | Story im „Als … möchte ich … damit …"-Format + 3 Kriterien | legt Karte im Backlog an |
| Zerlegen | 3–7 Tasks zur Story „In Arbeit" | hängt Kriterien an, öffnet Editor |
| Schätzen | Punktevorschlag + Begründung (Vergleichsstory, Risiko) | setzt Story Points |
| Priorisieren | sortiertes Backlog + Hinweis auf Überschneidungen | schreibt neue `order`, wechselt zu Backlog |
| Sprint-Report | Zähler fertig/laufend, Review-Stau, offene Kriterien | kein Apply |
| „AI ergänzen" (Editor) | 3 zusätzliche Kriterien zur offenen Story | hängt sie an |

Freitext-Routing im Prototyp per Keyword (lowercase): „schätz"/„punkte" → Schätzen,
„zerleg"/„task" → Zerlegen, „priorisier"/„backlog" → Priorisieren, „report"/„status"/„sprint" →
Report, sonst Story-Vorschlag. In Produktion durch Tool-Calling ersetzen: das Modell bekommt Board,
Backlog und Sprint als Kontext und gibt strukturiertes JSON zurück
(`{ title, text, bullets[], apply: { type, payload } }`), damit der Apply-Button clientseitig
deterministisch bleibt. API-Key ausschließlich serverseitig.

## State Management
```
screen: "login" | "app"
email, password, loginError, loggingIn
view: "overview" | "board" | "backlog" | "sprint"
query                     // Board-Suche
cards: Card[]             // Quelle der Wahrheit
order: number[]           // globale Reihenfolge (Backlog-Rang + Board-Sortierung)
dragId, overCol           // Drag & Drop
editing: number | null    // offene Story im Editor
acDraft, commentDraft
aiOpen, draft, thinking, messages[]
nextId
```
```
Card = {
  id, key: "KR-<id>", col: ColId, epic: "Onboarding"|"Board"|"AI-Helfer",
  points: 1|2|3|5|8|13, sprint: boolean,
  title, story,
  acs: { text, done }[],
  comments: { who, when, text }[]
}
```
Abgeleitet (nicht speichern): Spaltenzähler und -punkte, Fortschritt, Epic-Quoten, Sprintsumme,
AK-Zähler „2/3".

Transitions: Login-Erfolg → `screen: "app"`. Tab-Klick → `view`. Drop → `card.col`.
Karte/Textbutton-Klick → `editing`. ↑/↓ → Tausch in `order`. Sprint-Toggle → `card.sprint`.
Apply-Button → jeweilige Mutation. **Persistenz fehlt im Prototyp** — in Produktion pro Mutation
optimistisch schreiben und gegen die API syncen.

## Interactions & Behavior
- **Drag & Drop:** Prototyp nutzt HTML5-DnD (`draggable`, `onDragStart/Over/Leave/Drop`,
  `effectAllowed = "move"`, `preventDefault` im DragOver). Für Produktion `@dnd-kit` — wegen Touch
  und Tastaturbedienung. Feedback beibehalten: gezogene Karte `opacity: .4`, Zielspalte accent-getönt
  mit gestricheltem Rand.
- **Suche:** live, ohne Debounce (bei echten Datenmengen 200 ms debouncen), filtert Board, Backlog und Sprint gleichermaßen.
- **Transitions:** Fortschrittsbalken `width .4s ease`, Kapazität `.35s ease`, Spaltenhintergrund `.15s ease`.
- **Tastatur:** Enter sendet Chat, fügt Kriterium bzw. Kommentar hinzu (mit `preventDefault`).
- **Focus:** `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` kommt aus
  `styles.css` — nicht überschreiben.
- **Fehlend, bewusst:** Responsive/Mobile (Design ist ab ~1280 px gedacht), Registrierungs-Screen,
  echtes Passwort-Reset, Mehrbenutzer/Rollen, Undo.

## Animationen
```css
@keyframes om-in    { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
@keyframes om-pulse { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
```
`om-in`: Chat-Bubbles (`.25s ease both`) und Editor-Drawer (`.2s ease both`).
`om-pulse`: „denkt nach …" (`1.2s ease infinite`).
Scrollbars: `::-webkit-scrollbar` 10px, Thumb `var(--color-neutral-300)`, `border-radius: 999px`.

## Design Tokens
Alle Werte kommen aus `styles.css` (mitgeliefert). Nicht duplizieren — die Datei in den Build
übernehmen oder ihre `:root`-Variablen in das Token-System des Codebases überführen.

Kern: `--color-bg #f5ead8`, `--color-surface #ebddc5`, `--color-text #201e1d`,
`--color-accent #c67139` (Terrakotta), `--color-accent-2 #7a8a5e` (Salbei), dazu 100–900-Rampen
für neutral / accent / accent-2.
Schrift: `--font-heading` Caprasimo 400, `--font-body` Figtree 400/600/700 (Google Fonts, im
`@import` von `styles.css`).
Abstände: `--space-1` 4.4 · `-2` 8.8 · `-3` 13.2 · `-4` 17.6 · `-6` 26.4 · `-8` 35.2 px.
Radien: `--radius-sm` 8 · `--radius-md` 16 · `--radius-lg` 28 px; Buttons und Inputs `999px`.
Schatten: `--shadow-sm/md/lg`.

Klassen aus dem System, die der Prototyp nutzt: `.btn` (`.btn-primary`, `.btn-secondary`,
`.btn-ghost`, `.btn-block`), `.tag` (`.tag-accent`, `.tag-accent-2`, `.tag-neutral`), `.card`
(`.card-kicker`, `.elev-sm/md/lg`), `.input`, `.field`, `.nav`, `.nav-brand`, `.table`,
`.dialog-backdrop`. Epic → Tag-Mapping: Onboarding = `.tag-accent`, Board = `.tag-accent-2`,
AI-Helfer = `.tag-neutral`.

Design-System-Regeln (aus `design-system/readme.md`): links ausgerichtete, asymmetrische Layouts;
stark gerundete Formen; Salbei als echte zweite Stimme, nicht nur Highlight; keine scharfen Ecken;
Fotos immer durch `.washed`; Icons Lucide bei `stroke-width: 2.75`. Der Prototyp nutzt Textzeichen
(„✓", „✕", „↑", „↓", „·") als Platzhalter — in Produktion durch Lucide-Icons ersetzen
(check, x, arrow-up, arrow-down, send, sparkles).

## Assets
Keine Bilder. Schriften über Google Fonts (`@import` in `styles.css`). Icons: Lucide, noch einzubauen.

## Seed-Daten
`Kanban Tool.dc.html` enthält zehn Storys (KR-1 … KR-10) mit realistischen deutschen Titeln,
Akzeptanzkriterien, Punkten und Sprint-Flags, verteilt über alle fünf Spalten. Für Demo-Umgebungen
übernehmen; für Produktion ist ein leeres Board plus Empty State nötig (der als KR-10 selbst im
Backlog steht und noch nicht designt ist).

## Files
- `Kanban Tool.dc.html` — der vollständige Prototyp (Markup + Logik). Primäre Referenz.
- `design-system/styles.css` — Tokens und Komponentenklassen. In den Build übernehmen.
- `design-system/readme.md` — die Regeln des Organic Design Systems.
