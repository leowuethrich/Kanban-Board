import type { ColId, Epic, Points, View } from "./types";

export const COLS: { id: ColId; name: string }[] = [
  { id: "backlog", name: "Backlog" },
  { id: "ready", name: "Bereit" },
  { id: "doing", name: "In Arbeit" },
  { id: "review", name: "Review" },
  { id: "done", name: "Fertig" },
];

export const EPICS: Epic[] = ["Onboarding", "Board", "AI-Helfer"];

export const TAGS: Record<Epic, string> = {
  Onboarding: "tag-accent",
  Board: "tag-accent-2",
  "AI-Helfer": "tag-neutral",
};

export const TABS: { id: View; name: string }[] = [
  { id: "overview", name: "Übersicht" },
  { id: "board", name: "Board" },
  { id: "stories", name: "User Stories" },
  { id: "sprint", name: "Sprint" },
];

export const POINTS: Points[] = [1, 2, 3, 5, 8, 13];

export const CAPACITY = 21;

export function colName(id: ColId): string {
  return COLS.find((c) => c.id === id)?.name ?? "";
}

export function tagClass(epic: Epic): string {
  return TAGS[epic] ?? "tag-neutral";
}
