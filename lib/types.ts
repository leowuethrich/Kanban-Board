export type ColId = "backlog" | "ready" | "doing" | "review" | "done";
export type Epic = "Onboarding" | "Board" | "AI-Helfer";
export type Points = 1 | 2 | 3 | 5 | 8 | 13;

export interface Ac {
  text: string;
  done: boolean;
}

export interface Comment {
  who: string;
  when: string;
  text: string;
}

/** Kanban-Karte. Optional einer User Story zugeordnet (storyId). */
export interface Task {
  id: number;
  key: string; // "T-<id>"
  col: ColId;
  points: Points;
  sprint: boolean;
  storyId: number | null;
  title: string;
  description: string;
  acs: Ac[];
  comments: Comment[];
}

/** User Story im eigenen Tab. Aus ihr werden per AI Tasks abgeleitet. */
export interface UserStory {
  id: number;
  key: string; // "US-<id>"
  title: string;
  story: string; // "Als … möchte ich … damit …"
  epic: Epic;
  acs: Ac[];
}

export type View = "overview" | "board" | "stories" | "sprint";

/**
 * Was der Bestätigen-Button einer AI-Bubble bewirkt. Serialisierbar; wird
 * clientseitig deterministisch vom Reducer angewendet — die AI schreibt nie
 * direkt in Firestore.
 */
export interface TaskSpec {
  title: string;
  description: string;
  col: ColId;
  points: Points;
}

export interface StorySpec {
  title: string;
  story: string; // "Als … möchte ich … damit …"
  epic: Epic;
  acs: string[];
  tasks: TaskSpec[];
}

export type ApplyAction =
  | { type: "ingest"; stories: StorySpec[]; looseTasks?: TaskSpec[] }
  | { type: "createTask"; title: string; description: string; col: ColId; points: Points; storyId: number | null; acs: string[] }
  | { type: "deriveTasks"; storyId: number; tasks: TaskSpec[] }
  | { type: "syncStory"; storyId: number; addTasks: TaskSpec[]; appendAcs: { taskId: number; acs: string[] }[] }
  | { type: "appendTaskAcs"; taskId: number; acs: string[]; openEditor?: boolean }
  | { type: "setTaskPoints"; taskId: number; points: Points }
  | { type: "reorderTasks"; order: number[] };

export interface Message {
  id: number;
  role: "ai" | "me";
  at?: number; // Zeitstempel (epoch ms), gesetzt beim Anlegen
  title?: string;
  text?: string;
  lines?: string[];
  applyLabel?: string;
  apply?: ApplyAction;
}

/** Ein abgelegtes (nicht gelöschtes) Gespräch. „Neu" archiviert hierher. */
export interface ArchivedChat {
  id: number;
  at: number; // archiviert am (epoch ms)
  messages: Message[];
  memory: string; // Gesprächsnotiz zum Zeitpunkt der Archivierung
}
