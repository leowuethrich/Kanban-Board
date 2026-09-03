import type { ApplyAction } from "./types";

/** Vom AI-Endpoint zurückgegebene, strukturierte Antwort. */
export interface AiResult {
  title: string;
  text: string;
  bullets: string[];
  applyLabel?: string;
  apply?: ApplyAction;
}

/** Eine Zeile Gesprächsverlauf, an den Endpoint mitgeschickt. */
export interface ChatTurn {
  role: "ai" | "me";
  text: string;
}

/** Vom Client an /api/ai gesendete Anfrage. */
export type AiRequest =
  | { kind: "deriveTasks"; storyId: number }
  | { kind: "syncStory"; storyId: number }
  | { kind: "estimate"; taskId: number }
  | { kind: "prioritise" }
  | { kind: "report" }
  | { kind: "tidyUp" }
  | { kind: "chat"; text: string; history: ChatTurn[] };

export type AiKind = AiRequest["kind"];
