import type { ApplyAction } from "./types";

/** Vom AI-Endpoint zurückgegebene, strukturierte Antwort. */
export interface AiResult {
  title: string;
  text: string;
  bullets: string[];
  applyLabel?: string;
  apply?: ApplyAction;
  /** Aktualisierte Gesprächsnotiz — nur bei Chat-Aufrufen gesetzt. Wird
   *  clientseitig als state.chatMemory gespeichert und beim nächsten Aufruf
   *  wieder mitgeschickt. Speist sich ausschließlich aus dem Chat. */
  memory?: string;
}

/** Eine Zeile Gesprächsverlauf, an den Endpoint mitgeschickt. */
export interface ChatTurn {
  role: "ai" | "me";
  text: string;
}

/** Gesprächskontext, den jeder Aufruf mitschickt (auch die Schnellaktionen).
 *  memory = rollierende Notiz, history = die letzten Roh-Nachrichten. */
export interface ChatContext {
  memory: string;
  history: ChatTurn[];
}

/** Vom Client an /api/ai gesendete Anfrage. */
export type AiRequest =
  | { kind: "deriveTasks"; storyId: number; context: ChatContext }
  | { kind: "syncStory"; storyId: number; context: ChatContext }
  | { kind: "estimate"; taskId: number; context: ChatContext }
  | { kind: "prioritise"; context: ChatContext }
  | { kind: "report"; context: ChatContext }
  | { kind: "tidyUp"; context: ChatContext }
  | { kind: "chat"; text: string; context: ChatContext };

export type AiKind = AiRequest["kind"];
