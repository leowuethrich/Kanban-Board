# Krumen — Kanban & Projektplanung mit AI-Helfer

Web-Tool für Projektplanung: Firebase-Login, Kanban-Board mit Drag & Drop,
User-Story-Tab, Sprint-Planung — und ein **konversationeller Planungs-Assistent**:
Idee ins Chat-Feld, der Assistent fragt nach und macht am Ende User Stories +
Backlog-Tasks daraus, die du mit einem Klick übernimmst. Oberfläche komplett
auf Deutsch.

Optik nach dem Design-Handoff in [`design-handoff/`](design-handoff/) (Organic Design System).

## Konzept

- **Board** (`tasks[]`) — 5 Spalten: Backlog, Bereit, In Arbeit, Review, Fertig.
  Tasks per HTML5-DnD verschiebbar. Ein Task ist optional einer User Story zugeordnet.
- **User Stories** (`stories[]`, eigener Tab) — Titel, „Als … möchte ich … damit …",
  Epic, Akzeptanzkriterien. Kein Kanban-Status.
- **Chat-Panel (Hauptweg)** — du erzählst von deiner Idee, der Assistent stellt
  Rückfragen (Plattform? Umfang? Muss-Features?). Wenn genug klar ist, legt er
  **einen** Vorschlag vor: N User Stories mit Akzeptanzkriterien + je 3–7 Tasks.
  Ein Klick „Projekt anlegen" → alles landet gleichzeitig im Tool, Tasks mit ihrer
  Story verknüpft, im Backlog. (`apply`-Typ `ingest`.) Der ganze Gesprächsverlauf
  wird mitgeschickt, damit der Assistent den Faden behält. **„Neu"** im Panel-Kopf
  leert das Gespräch (Board bleibt).
- **Buttons an jeder Story** (falls du doch manuell startest):
  - **Tasks ableiten** → 3–7 Umsetzungs-Tasks aus einer bestehenden Story.
  - **Mit Tasks abgleichen** → Lücken zwischen Tasks und Akzeptanzkriterien.
- **Quick-Actions** — Priorisieren, Sprint-Report, Aufräumen.
- Jede Mutation läuft über einen Bestätigen-Button; **die AI schreibt nie direkt**.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Styling: Organic Design System in `app/globals.css`, alle Werte als `var(--*)`.
  Schriften Caprasimo / Figtree via Google-Fonts-`@import`.
- **Auth: Firebase Email/Password** — offener Signup (Portfolio-Demo). Missbrauch
  der AI ist über das serverseitige Rate-Limit gedeckelt (siehe unten).
- **Persistenz: Cloud Firestore** — ein Dokument `boards/{uid}` pro Nutzer mit
  `tasks`, `taskOrder`, `stories`, `messages` (AI-Chat, persistiert, max. 300),
  `nextTaskId`, `nextStoryId`, `msgSeq`. Live über `onSnapshot`, lokale Änderungen
  500 ms debounced zurückgeschrieben, eigenes Echo per Signatur unterdrückt.
- **AI: Google Gemini, serverseitig.** `app/api/ai/route.ts` ruft
  `ai.models.generateContent` mit `responseMimeType: "application/json"` auf und validiert die
  Antwort mit Zod. Der API-Key (`GEMINI_API_KEY`) bleibt im Server-Bundle.
  Das Modell gibt `{ title, text, bullets[], apply? }` zurück; `apply` ist eine
  `ApplyAction`, die der Reducer clientseitig deterministisch anwendet.
- **Offener Signup + Rate-Limit.** Fremde können sich registrieren (Portfolio-Demo).
  Jeder `/api/ai`-Aufruf verlangt das Firebase-ID-Token des Nutzers; der Endpoint
  verifiziert es mit dem Admin SDK und zählt einen Zähler in `usage/{uid}` hoch.
  Gäste: `AI_GUEST_DAILY_LIMIT` (Default 5) AI-Aufrufe pro Tag, dann 429. Das
  Konto in `AI_OWNER_EMAIL` hat ein praktisch unbegrenztes Limit. Board, Login und
  Drag & Drop sind nicht limitiert.
- Leerer Start: keine Seed-Daten.

## Setup

### 1. Firebase (Console, einmalig) — Projekt `kanbanboard-cfc5c`

1. **Firestore-Datenbank anlegen** — Firestore Database → „Datenbank erstellen" →
   Region `eur3` → Produktionsmodus. Ohne diesen Schritt: `Database '(default)' not
   found`, App bleibt leer, zeigt „synchronisiert …" (kein Crash).
2. **Security Rules** — Firestore → Regeln → Inhalt von [`firestore.rules`](firestore.rules)
   → Veröffentlichen. (`boards/{uid}` nur für den angemeldeten Nutzer; Payload-Shape
   und -Größe begrenzt; alles andere gesperrt.)
3. **Email/Password Auth** — Authentication → Sign-in method → aktivieren.
   Signup bleibt offen — Fremde sollen die Demo ausprobieren können.
4. **Service-Account-Key** — Projekteinstellungen → Dienstkonten → „Neuen privaten
   Schlüssel generieren". Die JSON-Datei base64-kodieren und als
   `FIREBASE_SERVICE_ACCOUNT` in `.env.local` (einzeilig). Braucht der Server zum
   Verifizieren der ID-Tokens und für den Rate-Limit-Zähler.
5. **Dein Konto anlegen** — Authentication → Users → „Add user" → deine E-Mail;
   dieselbe E-Mail in `.env.local` als `AI_OWNER_EMAIL`. Dann hast du kein AI-Limit.

### 2. Umgebungsvariablen (`.env.local`, nicht committet)

Vorlage: [`.env.example`](.env.example).

```
NEXT_PUBLIC_FIREBASE_*       # Web-Config aus der Firebase Console (nicht geheim)
GEMINI_API_KEY=…            # serverseitig, NIEMALS mit NEXT_PUBLIC_ prefixen
GEMINI_MODEL=gemini-3.1-flash-lite
FIREBASE_SERVICE_ACCOUNT=…  # base64 der Service-Account-JSON
AI_OWNER_EMAIL=…            # deine E-Mail — praktisch unbegrenzt
AI_GUEST_DAILY_LIMIT=5      # AI-Aufrufe/Tag für alle anderen
```

Ohne `GEMINI_API_KEY` läuft alles außer der AI: die AI-Buttons sind deaktiviert
mit Hinweistext.

## Entwicklung

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Struktur

```
app/
  layout.tsx            Root-Layout (lang="de", Metadata)
  globals.css           Design-System-Tokens + Komponentenklassen + Animationen
  page.tsx              rendert <App> nach Client-Mount
  api/ai/route.ts       Gemini-Aufruf (serverseitig), GET = { ready }, POST = { result }
  components/
    App.tsx             Orchestrator: Auth, Firestore-Sync, AI-Wiring, Routing der Views
    LoginScreen.tsx     Anmelden / Konto anlegen (Firebase Auth, deutsche Fehlertexte)
    BoardView.tsx        5-Spalten-Board mit Drag & Drop (tasks)
    StoriesView.tsx      User-Story-Liste mit „Tasks ableiten" / „Abgleichen"
    OverviewView.tsx     Stat-Karten, Fortschritt, Epics
    SprintView.tsx       Kapazitätskarte + Task-Zeilen mit Sprint-Toggle
    TaskEditor.tsx       Drawer für einen Task (Titel, Story-Select, Spalte, AK, Kommentare)
    StoryEditor.tsx      Drawer für eine User Story (+ AI-Buttons, verknüpfte Tasks)
    AiPanel.tsx          Chat-Verlauf, Quick-Actions, Bestätigen-Buttons
lib/
  types.ts             Task, UserStory, Ac, Comment, Message, ApplyAction
  constants.ts         COLS, EPICS, TABS, POINTS, CAPACITY
  store.ts             Reducer über tasks/stories/messages + toPersist
  firebase.ts          Firebase-Init (getDb / getFirebaseAuth), firebaseReady
  auth.ts              signIn / signUp / signOutUser / onAuthChange, deutsche Fehlertexte
  boardSync.ts         subscribeBoard (onSnapshot) / saveBoard (setDoc)
  useBoardSync.ts      Hook: hydrate / Erst-Write / debounced Write / Echo-Filter / Status
  useMounted.ts        useSyncExternalStore-Hook für den Client-Mount-Gate
  aiTypes.ts           AiRequest (mit ID-Token-Kontext), AiResult, AiKind
  aiSchema.ts          Zod-Schema für die Server-Validierung der Modellantwort
  aiPrompt.ts          System-Prompt + Board-Kontext + Prompt je Aktion
  aiClient.ts          fetch("/api/ai") mit Bearer-ID-Token — askAi(), aiReady()
  firebaseAdmin.ts     Admin SDK: verifyCaller() (ID-Token → uid/email), adminDb()
  aiGate.ts            Rate-Limit: consumeQuota() zählt usage/{uid}, Owner-Bypass
firestore.rules        Security Rules — boards/{uid}, usage/{uid} (per Console veröffentlichen)
```

## Bewusst nicht enthalten

Responsive/Mobile (Design ab ~1280 px), Passwort-Reset, Rollen/Freigaben, Undo,
Streaming der AI-Antworten, mehrere Boards/Projekte.
