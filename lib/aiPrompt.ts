import { COLS } from "./constants";
import type { AiRequest, ChatContext } from "./aiTypes";
import type { PersistState } from "./store";

/** Kompakter Board-Kontext fürs Modell (nur, was für die Aufgabe zählt). */
export function boardContext(state: PersistState): string {
  const cols = COLS.map((c) => `${c.id} = ${c.name}`).join(", ");
  const stories = state.stories.map((s) => ({
    id: s.id,
    key: s.key,
    epic: s.epic,
    title: s.title,
    story: s.story,
    akzeptanzkriterien: s.acs.map((a) => a.text),
  }));
  const tasks = state.tasks.map((t) => ({
    id: t.id,
    key: t.key,
    spalte: t.col,
    punkte: t.points,
    sprint: t.sprint,
    storyId: t.storyId,
    title: t.title,
    beschreibung: t.description,
    akzeptanzkriterien: t.acs.map((a) => a.text),
  }));
  return [
    `Spalten: ${cols}`,
    `Vorhandene User Stories (${stories.length}):`,
    JSON.stringify(stories, null, 1),
    `Vorhandene Tasks (${tasks.length}):`,
    JSON.stringify(tasks, null, 1),
  ].join("\n");
}

export const SYSTEM_PROMPT = `Du bist der Planungs-Assistent eines deutschsprachigen Kanban-Tools ("Krumen").
Der Nutzer erzählt dir im Chat von seinen Ideen. Deine Aufgabe: die Idee im Gespräch
verstehen, gezielt nachfragen, und wenn genug klar ist, daraus User Stories und
Backlog-Tasks formen, die der Nutzer mit EINEM Klick übernimmt.

## Gesprächsführung
- Stelle pro Antwort höchstens 1–3 gezielte Rückfragen (Plattform? Zielgruppe? Umfang?
  Muss-Features vs. Später?). Keine Fragebatterien.
- Ist die Idee klein und eindeutig, kannst du auch sofort einen Vorschlag machen.
- Wenn der Nutzer "passt", "mach", "ja", "übernehmen" o. ä. sagt, oder du genug weißt:
  leg den Vorschlag mit "apply" vom Typ "ingest" vor.
- Nach dem Übernehmen: kurze Bestätigung, frag ob noch etwas ergänzt werden soll.

## Antwortformat — IMMER ein JSON-Objekt, sonst nichts (kein Markdown):
{
  "title": "<kurze Überschrift, Deutsch>",
  "text": "<1–4 Sätze Deutsch: Rückfrage oder Zusammenfassung des Vorschlags>",
  "bullets": ["<kurze Stichpunkte, Deutsch>", …],   // 0–10, z. B. die geplanten Stories
  "applyLabel": "<Button-Text>",                     // nur zusammen mit "apply"
  "apply": { … },                                    // optional, genau EINE Aktion
  "memory": "<aktualisierte Gesprächsnotiz, Deutsch>" // siehe unten — bei Chat-Zügen IMMER
}

## "memory" — dein Langzeitgedächtnis für DIESES Gespräch
- Bei jeder Chat-Antwort gibst du "memory" zurück: eine kompakte, aktualisierte
  Notiz (Stichpunkte, höchstens ~1500 Zeichen) mit dem, was du dir merken musst —
  getroffene Entscheidungen, Vorlieben des Nutzers, Rahmenbedingungen, offene
  Punkte, was schon übernommen wurde.
- Baue auf der bisherigen Notiz auf (sie steht im Prompt unter „Gesprächsnotiz"),
  ergänze und straffe sie. Kein Roman, keine wörtlichen Zitate.
- Die Notiz speist sich AUSSCHLIESSLICH aus diesem Chat. Nimm nichts aus dem
  Board-/Story-Kontext hinein, was nicht im Gespräch vorkam.
- Bei den Schnellaktionen (Report, Priorisieren, Aufräumen usw.) gibst du KEIN
  "memory" zurück (Feld weglassen) — die ändern das Gespräch nicht.

## "apply" — nur wenn der Nutzer den Vorschlag übernehmen soll. Sonst weglassen.
Hauptaktion für den Chat:
- "ingest": {
    "type": "ingest",
    "stories": [
      {
        "title": "<Kurztitel der Story>",
        "story": "Als <Rolle> möchte ich <Wunsch>, damit <Nutzen>.",
        "epic": "Onboarding" | "Board" | "AI-Helfer",
        "acs": ["<Akzeptanzkriterium>", …],           // 2–6
        "tasks": [
          { "title": "<Task>", "description": "<1 Satz>", "col": "backlog", "points": 1|2|3|5|8|13 },
          …                                            // 3–7 pro Story
        ]
      },
      …                                                // 1–8 Stories
    ],
    "looseTasks": [ { "title", "description", "col", "points" }, … ]  // optional: Tasks ohne Story
  }
  Alles darin ist NEU — keine IDs, das Tool vergibt sie. "col" fast immer "backlog".
  Wähle das "epic", das am besten passt (Onboarding = Nutzerzugang/Registrierung/erste
  Schritte; Board = Kernfunktionen/Fachlogik; AI-Helfer = alles rund um Assistenz/Automatik).

Weitere Aktionen (nur wenn passend):
- "createTask": { "type","title","description","col","points","storyId": <int|null>,"acs": [] }
- "deriveTasks": { "type","storyId": <int>,"tasks":[{title,description,col,points}] }  (nur mit vorhandener storyId)
- "syncStory": { "type","storyId": <int>,"addTasks":[…],"appendAcs":[{ "taskId": <int>,"acs":[…] }] }
- "appendTaskAcs": { "type","taskId": <int>,"acs":[…] }
- "setTaskPoints": { "type","taskId": <int>,"points": 1|2|3|5|8|13 }
- "reorderTasks": { "type","order":[<taskId>, …] }  (ALLE Task-IDs)
Bei diesen: nur storyId/taskId aus dem Board-Kontext verwenden.

Höchstens EIN "apply" pro Antwort. Antworte NUR mit dem JSON-Objekt.`;

function historyBlock(ctx: ChatContext, currentUserText?: string): string {
  const parts: string[] = [];
  const mem = ctx.memory.trim();
  parts.push(`## Gesprächsnotiz (dein bisheriges Gedächtnis für diesen Chat)\n${mem || "(noch leer)"}`);

  const lines = ctx.history
    .filter((t) => t.text.trim())
    .map((t) => `${t.role === "me" ? "Nutzer" : "Assistent"}: ${t.text}`);
  if (currentUserText) lines.push(`Nutzer: ${currentUserText}`);
  parts.push(`## Bisheriges Gespräch\n${lines.length ? lines.join("\n") : "(noch nichts)"}`);
  return parts.join("\n\n");
}

export function userPrompt(req: AiRequest, state: PersistState): string {
  const ctx = boardContext(state);
  const chat = historyBlock(
    req.context,
    req.kind === "chat" ? req.text : undefined,
  );
  switch (req.kind) {
    case "chat":
      return `${ctx}\n\n${chat}\n\nAntworte als JSON gemäß Systemvorgabe: entweder eine Rückfrage, oder — wenn genug klar ist bzw. der Nutzer zustimmt — ein "ingest"-Vorschlag. Gib "memory" aktualisiert zurück.`;
    case "deriveTasks": {
      const s = state.stories.find((x) => x.id === req.storyId);
      return `${ctx}\n\n${chat}\n\nLeite konkrete Umsetzungs-Tasks aus User Story ${s?.key ?? req.storyId} ab; berücksichtige die Gesprächsnotiz, falls relevant. Gib ein "apply" vom Typ "deriveTasks" mit storyId ${req.storyId} zurück. Kein "memory".`;
    }
    case "syncStory": {
      const s = state.stories.find((x) => x.id === req.storyId);
      return `${ctx}\n\n${chat}\n\nGleiche die vorhandenen Tasks von User Story ${s?.key ?? req.storyId} mit ihren Akzeptanzkriterien ab. Melde Lücken im "text"/"bullets" und schlage über ein "apply" vom Typ "syncStory" (storyId ${req.storyId}) fehlende Tasks und/oder Akzeptanzkriterien vor. Fehlt nichts, lass "apply" weg. Kein "memory".`;
    }
    case "estimate": {
      const t = state.tasks.find((x) => x.id === req.taskId);
      return `${ctx}\n\n${chat}\n\nSchätze Story Points für Task ${t?.key ?? req.taskId}. Begründe kurz (Vergleichstask, Risiko) und gib ein "apply" vom Typ "setTaskPoints" (taskId ${req.taskId}) zurück. Kein "memory".`;
    }
    case "prioritise":
      return `${ctx}\n\n${chat}\n\nSchlage eine sinnvolle Reihenfolge des Backlogs vor (Abhängigkeiten, Blocker zuerst; Gesprächsnotiz beachten). Begründe kurz und gib ein "apply" vom Typ "reorderTasks" mit der neuen Reihenfolge ALLER Task-IDs zurück. Kein "memory".`;
    case "report":
      return `${ctx}\n\n${chat}\n\nErstelle einen kurzen Sprint-Report: Zähler fertig/laufend, Review-Stau, offene Akzeptanzkriterien. Kein "apply", kein "memory".`;
    case "tidyUp":
      return `${ctx}\n\n${chat}\n\nRäume das Board auf: nenne Tasks ohne Story-Zuordnung, doppelte/überlappende Tasks, Tasks ohne Akzeptanzkriterien. Wenn eine einzelne konkrete Verbesserung als "apply" möglich ist, gib sie an — sonst nur Text und Bullets. Kein "memory".`;
  }
}
