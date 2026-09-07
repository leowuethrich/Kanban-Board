# Krumen — Kanban & Projektplanung mit AI-Helfer

Web-Tool für Projektplanung: Firebase-Login, Kanban-Board mit Drag & Drop,
User-Story-Tab, Sprint-Planung — und ein **konversationeller Planungs-Assistent**:
Idee ins Chat-Feld, der Assistent fragt nach und macht am Ende User Stories +
Backlog-Tasks daraus, die du mit einem Klick übernimmst. Oberfläche komplett
auf Deutsch, responsiv bis Handy.

Optik nach dem Design-Handoff in [`design-handoff/`](design-handoff/) (Organic Design System).

Live: [krumen.netlify.app](https://krumen.netlify.app)

## Konzept

- **Board** (`tasks[]`) — 5 Spalten: Backlog, Bereit, In Arbeit, Review, Fertig.
  Tasks per HTML5-DnD verschiebbar; auf dem Handy horizontales Scroll-Snap. Ein
  Task ist optional einer User Story zugeordnet.
- **User Stories** (`stories[]`, eigener Tab) — Titel, „Als … möchte ich … damit …",
  Epic, Akzeptanzkriterien. Kein Kanban-Status.
- **Chat-Panel (Hauptweg)** — du erzählst von deiner Idee, der Assistent stellt
  Rückfragen (Plattform? Umfang? Muss-Features?). Wenn genug klar ist, legt er
  **einen** Vorschlag vor: N User Stories mit Akzeptanzkriterien + je 3–7 Tasks.
  Ein Klick „Projekt anlegen" → alles landet gleichzeitig im Tool, Tasks mit ihrer
  Story verknüpft, im Backlog. (`apply`-Typ `ingest`.)
- **Chat-Gedächtnis** — jeder AI-Aufruf bekommt die letzten Roh-Nachrichten
  **plus eine rollierende Gesprächsnotiz** (`chatMemory`), die die AI nach jedem
  Chat-Zug selbst fortschreibt. So bleibt der Faden auch über lange Gespräche
  erhalten. Die Notiz speist sich **nur** aus dem Chat, nie aus Board/Stories;
  Schnellaktionen dürfen sie nicht verändern (Server erzwingt das).
  **„Neu"** im Panel-Kopf löscht das Gespräch nicht, sondern **archiviert** es
  (`archivedChats`, max. 20). Umschalter Chat / Verlauf / Notiz; abgelegte
  Gespräche lassen sich fortsetzen oder löschen.
- **Buttons an jeder Story** (falls du doch manuell startest):
  - **Tasks ableiten** → 3–7 Umsetzungs-Tasks aus einer bestehenden Story.
  - **Mit Tasks abgleichen** → Lücken zwischen Tasks und Akzeptanzkriterien.
- **Quick-Actions** — Priorisieren, Sprint-Report, Aufräumen.
- Jede Mutation läuft über einen Bestätigen-Button; **die AI schreibt nie direkt**.
- **Undo** — nach „Task/Story löschen" und nach „AI übernehmen" erscheint ~7 s
  ein „Rückgängig"-Toast (setzt nur den Daten-Teil zurück, nicht den Chat).
- **Kontoverwaltung** — Passwort ändern (mit Reauth), Passwort vergessen
  (Login-Screen), Konto löschen (Board + AI-Zähler werden mitentfernt).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict)
- Styling: Organic Design System in `app/globals.css`, alle Werte als `var(--*)`.
  Schriften Caprasimo / Figtree via Google-Fonts-`@import`. Responsive über
  `useMediaQuery` (Breakpoint 820 px) + Media-Queries für die Klassen.
- **Auth: Firebase Email/Password** — **kein Self-Signup** (nach Bot-Missbrauch
  geschlossen). Konten legt der Betreiber in der Firebase Console an. **E-Mail-
  Verifizierung ist Pflicht**: ohne bestätigte Adresse kein App-Zugang und keine
  AI-Nutzung (serverseitig in `/api/ai` geprüft).
- **Persistenz: Cloud Firestore** — ein Dokument `boards/{uid}` pro Nutzer mit
  `tasks`, `taskOrder`, `stories`, `messages` (AI-Chat, max. 300), `chatMemory`
  (rollierende Notiz, ≤ 4000 Z.), `archivedChats` (≤ 20 abgelegte Gespräche),
  `nextTaskId`, `nextStoryId`, `msgSeq`. Live über `onSnapshot`, lokale Änderungen
  500 ms debounced zurückgeschrieben (`updatedAt = serverTimestamp()`), eigenes
  Echo per Signatur unterdrückt.
- **AI: Google Gemini, serverseitig.** `app/api/ai/route.ts` ruft
  `ai.models.generateContent` mit `responseMimeType: "application/json"` auf und
  validiert die Antwort mit Zod. Der API-Key (`GEMINI_API_KEY`) bleibt im
  Server-Bundle. Das Modell gibt `{ title, text, bullets[], apply?, memory? }`
  zurück; `apply` ist eine `ApplyAction`, die der Reducer clientseitig
  deterministisch anwendet.
- **Server-Auth ohne `firebase-admin`** (scheitert im Netlify-Lambda): ID-Token
  per `jose` gegen Googles securetoken-JWKS verifiziert; Firestore-Zugriff für
  den Rate-Limit-Zähler über die REST-API mit einem selbst signierten
  Service-Account-JWT als OAuth2-Assertion. Siehe `lib/firebaseAdmin.ts`.
- **Mehrschichtiges Rate-Limiting** (`lib/aiGate.ts`) — jeder `/api/ai`-Aufruf
  verlangt das verifizierte ID-Token; `consumeQuota` prüft über eine gleitende
  Liste der letzten Aufruf-Zeitstempel (`usage/{uid}.hits`) in **einem
  Compare-and-Swap-Write**:

  | Schicht | Gast (Default) | Owner (Default) | Env |
  |---|---|---|---|
  | Mindestabstand | 8 s | 1 s | `AI_{GUEST,OWNER}_MIN_INTERVAL_S` |
  | pro Minute | 3 | 20 | `AI_{GUEST,OWNER}_PER_MIN` |
  | pro Stunde | 15 | 200 | `AI_{GUEST,OWNER}_PER_HOUR` |
  | pro Tag | 30 | 500 | `AI_{GUEST,OWNER}_PER_DAY` |

  Dazu ein globaler Tagesdeckel über **alle Gäste** (`usage/__global__`,
  `AI_GLOBAL_GUEST_PER_DAY`, Default 300) als Kosten-Obergrenze fürs Projekt.
  „Owner" = das Konto in `AI_OWNER_EMAIL`. Board, Login und Drag & Drop sind
  nicht limitiert.
- **Sicherheits-Header** (`next.config.ts`) — CSP (nur die tatsächlich genutzten
  Firebase-/Google-Origins), HSTS, `frame-ancestors 'none'`, `X-Content-Type-
  Options`, Permissions-Policy. CSP-Verstöße gehen an `POST /api/csp-report`
  (loggt nur, gedeckelt).
- **Consent-Banner** — Firebase Analytics wird erst nach explizitem „Akzeptieren"
  dynamisch geladen (`lib/consent.ts`, `ConsentBanner.tsx`). Rechtstexte
  (Impressum, Datenschutz nach revDSG, Nutzungsbedingungen) unter `/legal/*`.
- **Error Boundaries** — `app/error.tsx` (unter dem Layout) und
  `app/global-error.tsx` (auch für Fehler im Layout).
- Leerer Start: keine Seed-Daten.

## Setup

### 1. Firebase (Console, einmalig) — Projekt `kanbanboard-cfc5c`

1. **Firestore-Datenbank anlegen** — Firestore Database → „Datenbank erstellen" →
   Region `eur3` → Produktionsmodus. Ohne diesen Schritt: `Database '(default)' not
   found`, App bleibt leer, zeigt „synchronisiert …" (kein Crash).
2. **Security Rules** — Firestore → Regeln → Inhalt von [`firestore.rules`](firestore.rules)
   → Veröffentlichen. (`boards/{uid}` nur für den angemeldeten Nutzer, mit
   Payload-Shape/-Größe-Prüfung inkl. `chatMemory`/`archivedChats` und
   `updatedAt == request.time`; `allow delete` für Konto-Löschung; `usage/*` nur
   lesbar, nie vom Client schreibbar; alles andere gesperrt.) **Bei Schema-
   Änderungen am Board hier nachziehen, sonst schlägt das Speichern fehl.**
3. **Email/Password Auth** — Authentication → Sign-in method → aktivieren.
   **Self-Signup in der Console deaktivieren** (Settings → User actions → „Enable
   create") — Konten legt nur der Betreiber an.
4. **Service-Account-Key** — Projekteinstellungen → Dienstkonten → „Neuen privaten
   Schlüssel generieren". Die JSON-Datei base64-kodieren und als
   `FIREBASE_SERVICE_ACCOUNT` in `.env.local` (einzeilig). Braucht der Server zum
   Verifizieren der ID-Tokens und für den Rate-Limit-Zähler.
5. **Dein Konto anlegen** — Authentication → Users → „Add user" → deine E-Mail,
   dann verifizieren (Link in der App anfordern). Dieselbe E-Mail in `.env.local`
   als `AI_OWNER_EMAIL` → Owner-Rate-Limits statt Gäste-Limits.
6. **Empfohlen:** Firestore **Point-in-time recovery** aktivieren (Backup) und
   ein **Cloud-Billing-Budget** mit E-Mail-Alarm einrichten.

### 2. Umgebungsvariablen (`.env.local`, nicht committet)

Vorlage: [`.env.example`](.env.example).

```
NEXT_PUBLIC_FIREBASE_*       # Web-Config aus der Firebase Console (nicht geheim)
GEMINI_API_KEY=…            # serverseitig, NIEMALS mit NEXT_PUBLIC_ prefixen
GEMINI_MODEL=gemini-3.1-flash-lite
FIREBASE_SERVICE_ACCOUNT=…  # base64 der Service-Account-JSON
AI_OWNER_EMAIL=…            # dein Konto — Owner-Rate-Limits
# Rate-Limits optional überschreiben (Defaults in lib/aiGate.ts):
# AI_GUEST_PER_MIN, AI_GUEST_PER_HOUR, AI_GUEST_PER_DAY, AI_GUEST_MIN_INTERVAL_S
# AI_OWNER_PER_MIN, AI_OWNER_PER_HOUR, AI_OWNER_PER_DAY, AI_OWNER_MIN_INTERVAL_S
# AI_GLOBAL_GUEST_PER_DAY
```

Ohne `GEMINI_API_KEY` läuft alles außer der AI: die AI-Buttons sind deaktiviert
mit Hinweistext.

## Entwicklung

```bash
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm test           # Vitest — Reducer + Rate-Limit-Fensterlogik
npm run test:watch
```

## Deployment (Netlify)

Aus dem GitHub-Repo (`@netlify/plugin-nextjs`). **Pushes lösen keinen Deploy
aus** (kein Webhook) — Build manuell per `POST /api/v1/sites/{id}/builds`
triggern. Env-Vars in den Netlify-Site-Settings, `.next` als Publish-Dir,
`NODE_VERSION=20`.

## Struktur

```
app/
  layout.tsx                     Root-Layout (lang="de", Metadata, Viewport)
  error.tsx / global-error.tsx   Error Boundaries
  globals.css                    Design-Tokens + Komponentenklassen + Media-Queries
  page.tsx                       rendert <App> nach Client-Mount
  icon.svg / apple-icon.png / favicon.ico   Krumen-Markenzeichen
  api/
    ai/route.ts                  Gemini (serverseitig), GET = { ready }, POST = { result }
    csp-report/route.ts          nimmt CSP-Verstoß-Berichte entgegen (loggt nur)
    account/delete-usage/route.ts  räumt usage/{uid} beim Konto-Löschen auf (ID-Token)
  legal/                         Impressum, Datenschutz (revDSG), Nutzungsbedingungen
  components/
    App.tsx             Orchestrator: Auth, Firestore-Sync, AI-Wiring, Views, Undo
    LoginScreen.tsx     Anmelden + „Passwort vergessen?" (kein Signup)
    AccountMenu.tsx     Avatar-Dropdown: Passwort ändern, Abmelden, Konto löschen
    BoardView.tsx       5-Spalten-Board mit Drag & Drop, Handy: Scroll-Snap
    StoriesView.tsx     User-Story-Liste mit „Tasks ableiten" / „Abgleichen"
    OverviewView.tsx    Stat-Karten, Fortschritt, Epics
    SprintView.tsx      Kapazitätskarte + Task-Zeilen mit Sprint-Toggle
    TaskEditor.tsx      Drawer/Bottom-Sheet für einen Task
    StoryEditor.tsx     Drawer/Bottom-Sheet für eine User Story (+ AI-Buttons)
    AiPanel.tsx         Chat / Verlauf / Notiz, Quick-Actions, Bestätigen-Buttons
    ConsentBanner.tsx   Analytics-Einwilligung; SiteFooter.tsx  Fußzeile + Legal-Links
lib/
  types.ts             Task, UserStory, Ac, Comment, Message, ArchivedChat, ApplyAction
  constants.ts         COLS, EPICS, TABS, POINTS, CAPACITY
  store.ts             Reducer (+ applyAi, Archiv, Undo-Snapshot) + toPersist
  store.test.ts        Vitest: Reducer-Verhalten
  firebase.ts          Firebase-Init (getDb / getFirebaseAuth), firebaseReady, Analytics
  auth.ts              signIn / signOut / onAuthChange / changePassword / deleteAccount / …
  boardSync.ts         subscribeBoard (onSnapshot) / saveBoard / deleteBoard
  useBoardSync.ts      Hook: hydrate / Erst-Write / debounced Write / Echo-Filter / Status
  useMounted.ts        useSyncExternalStore-Hook für den Client-Mount-Gate
  useMediaQuery.ts     reaktiver Media-Query-Match (SSR-sicher), MOBILE_QUERY
  consent.ts           localStorage-Einwilligungsstatus
  aiTypes.ts           AiRequest (mit ChatContext), AiResult (+ memory), ChatTurn
  aiSchema.ts          Zod-Schema für die Server-Validierung der Modellantwort
  aiPrompt.ts          System-Prompt + Board-Kontext + Gesprächsnotiz + Prompt je Aktion
  aiClient.ts          fetch("/api/ai") mit Bearer-ID-Token (401-Retry) — askAi(), aiReady()
  firebaseAdmin.ts     verifyCaller() via jose/JWKS; usage-CAS über Firestore-REST
  aiGate.ts            mehrschichtiges Rate-Limit: consumeQuota(), windowDenial(), nextHits()
  aiGate.test.ts       Vitest: Fensterlogik
firestore.rules        Security Rules — boards/{uid}, usage/{uid} (per Console veröffentlichen)
```

## Bekannte Grenzen / bewusst nicht enthalten

- **MFA** braucht Firebase Identity Platform (kostenpflichtig) — stattdessen
  strenge Rate-Limits + Owner-Deckel.
- Board-Tastaturbedienung (Drag & Drop ist Maus/Touch; Fallback: Spalten-Select
  im Task-Editor).
- Rollen/Freigaben, geteilte Boards, mehrere Projekte pro Konto.
- Streaming der AI-Antworten.
- Dark Mode (Design ist rein hell).
