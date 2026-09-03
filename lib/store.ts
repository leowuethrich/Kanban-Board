import type { Ac, ApplyAction, ColId, Epic, Message, Points, Task, UserStory } from "./types";

/** Nach Firestore synchronisierter Teil des States. Abgeleitete Werte nie speichern. */
export interface PersistState {
  tasks: Task[];
  taskOrder: number[]; // globale Reihenfolge (Board-Sortierung, AI-Priorisierung)
  stories: UserStory[];
  messages: Message[]; // AI-Chat, persistiert
  nextTaskId: number;
  nextStoryId: number;
  msgSeq: number;
}

export type AppState = PersistState;

export const INITIAL_MESSAGE: Message = {
  id: 1,
  role: "ai",
  text: "Moin. Erzähl mir einfach von deiner Idee — ich stelle Rückfragen und mache am Ende User Stories und Backlog-Tasks daraus, die du mit einem Klick übernimmst.",
};

/** Leerer Start: keine Seed-Daten. */
export function initialState(): AppState {
  return {
    tasks: [],
    taskOrder: [],
    stories: [],
    messages: [INITIAL_MESSAGE],
    nextTaskId: 1,
    nextStoryId: 1,
    msgSeq: 2,
  };
}

const MAX_MESSAGES = 300;

export type Action =
  | { type: "hydrate"; payload: PersistState }
  // Tasks
  | { type: "addTask"; col: ColId; id: number; storyId?: number | null }
  | { type: "updateTask"; id: number; patch: Partial<Task> }
  | { type: "moveTask"; id: number; col: ColId }
  | { type: "deleteTask"; id: number }
  | { type: "reorderTasks"; order: number[] }
  | { type: "rankTaskUp"; id: number }
  | { type: "rankTaskDown"; id: number }
  | { type: "toggleTaskSprint"; id: number }
  | { type: "addTaskAc"; id: number; text: string }
  | { type: "toggleTaskAc"; id: number; index: number }
  | { type: "removeTaskAc"; id: number; index: number }
  | { type: "addTaskComment"; id: number; text: string }
  // Stories
  | { type: "addStory"; id: number }
  | { type: "updateStory"; id: number; patch: Partial<UserStory> }
  | { type: "deleteStory"; id: number }
  | { type: "addStoryAc"; id: number; text: string }
  | { type: "toggleStoryAc"; id: number; index: number }
  | { type: "removeStoryAc"; id: number; index: number }
  // AI
  | { type: "pushMessage"; message: Omit<Message, "id"> }
  | { type: "applyAi"; action: ApplyAction }
  | { type: "resetChat" };

const ac = (text: string): Ac => ({ text, done: false });

function patch<T extends { id: number }>(list: T[], id: number, p: Partial<T>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...p } : x));
}

function newTask(id: number, col: ColId, storyId: number | null, overrides: Partial<Task> = {}): Task {
  return {
    id,
    key: "T-" + id,
    col,
    points: 3,
    sprint: false,
    storyId,
    title: "Neue Aufgabe",
    description: "",
    acs: [],
    comments: [],
    ...overrides,
  };
}

function pushMessage(state: AppState, message: Omit<Message, "id">): AppState {
  const messages = [...state.messages, { ...message, id: state.msgSeq }];
  return {
    ...state,
    messages: messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages,
    msgSeq: state.msgSeq + 1,
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.payload };

    // ── Tasks ──────────────────────────────────────────────
    case "addTask": {
      const t = newTask(action.id, action.col, action.storyId ?? null);
      return {
        ...state,
        tasks: [...state.tasks, t],
        taskOrder: [...state.taskOrder, action.id],
        nextTaskId: action.id + 1,
      };
    }

    case "updateTask":
      return { ...state, tasks: patch(state.tasks, action.id, action.patch) };

    case "moveTask":
      return { ...state, tasks: patch(state.tasks, action.id, { col: action.col }) };

    case "deleteTask":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        taskOrder: state.taskOrder.filter((x) => x !== action.id),
      };

    case "reorderTasks":
      return { ...state, taskOrder: action.order };

    case "rankTaskUp": {
      const o = state.taskOrder.slice();
      const j = o.indexOf(action.id);
      if (j > 0) [o[j - 1], o[j]] = [o[j], o[j - 1]];
      return { ...state, taskOrder: o };
    }

    case "rankTaskDown": {
      const o = state.taskOrder.slice();
      const j = o.indexOf(action.id);
      if (j >= 0 && j < o.length - 1) [o[j + 1], o[j]] = [o[j], o[j + 1]];
      return { ...state, taskOrder: o };
    }

    case "toggleTaskSprint": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return state;
      return { ...state, tasks: patch(state.tasks, action.id, { sprint: !t.sprint }) };
    }

    case "addTaskAc": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return state;
      return { ...state, tasks: patch(state.tasks, action.id, { acs: [...t.acs, ac(action.text)] }) };
    }

    case "toggleTaskAc": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return state;
      return {
        ...state,
        tasks: patch(state.tasks, action.id, {
          acs: t.acs.map((a, i) => (i === action.index ? { ...a, done: !a.done } : a)),
        }),
      };
    }

    case "removeTaskAc": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return state;
      return {
        ...state,
        tasks: patch(state.tasks, action.id, { acs: t.acs.filter((_, i) => i !== action.index) }),
      };
    }

    case "addTaskComment": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return state;
      return {
        ...state,
        tasks: patch(state.tasks, action.id, {
          comments: [...t.comments, { who: "DU", when: "gerade", text: action.text }],
        }),
      };
    }

    // ── Stories ────────────────────────────────────────────
    case "addStory": {
      const s: UserStory = {
        id: action.id,
        key: "US-" + action.id,
        title: "Neue User Story",
        story: "Als … möchte ich …, damit …",
        epic: "Board",
        acs: [],
      };
      return { ...state, stories: [...state.stories, s], nextStoryId: action.id + 1 };
    }

    case "updateStory":
      return { ...state, stories: patch(state.stories, action.id, action.patch) };

    case "deleteStory":
      return {
        ...state,
        stories: state.stories.filter((s) => s.id !== action.id),
        // verwaiste Tasks behalten, nur Verknüpfung lösen
        tasks: state.tasks.map((t) => (t.storyId === action.id ? { ...t, storyId: null } : t)),
      };

    case "addStoryAc": {
      const s = state.stories.find((x) => x.id === action.id);
      if (!s) return state;
      return { ...state, stories: patch(state.stories, action.id, { acs: [...s.acs, ac(action.text)] }) };
    }

    case "toggleStoryAc": {
      const s = state.stories.find((x) => x.id === action.id);
      if (!s) return state;
      return {
        ...state,
        stories: patch(state.stories, action.id, {
          acs: s.acs.map((a, i) => (i === action.index ? { ...a, done: !a.done } : a)),
        }),
      };
    }

    case "removeStoryAc": {
      const s = state.stories.find((x) => x.id === action.id);
      if (!s) return state;
      return {
        ...state,
        stories: patch(state.stories, action.id, { acs: s.acs.filter((_, i) => i !== action.index) }),
      };
    }

    // ── AI ─────────────────────────────────────────────────
    case "pushMessage":
      return pushMessage(state, action.message);

    case "applyAi":
      return applyAi(state, action.action);

    case "resetChat":
      return { ...state, messages: [{ ...INITIAL_MESSAGE, id: state.msgSeq }], msgSeq: state.msgSeq + 1 };

    default:
      return state;
  }
}

function applyAi(state: AppState, a: ApplyAction): AppState {
  switch (a.type) {
    case "ingest": {
      let storyId = state.nextStoryId;
      let taskId = state.nextTaskId;
      const newStories: UserStory[] = [];
      const newTasks: Task[] = [];

      for (const spec of a.stories) {
        const sid = storyId++;
        newStories.push({
          id: sid,
          key: "US-" + sid,
          title: spec.title,
          story: spec.story,
          epic: spec.epic,
          acs: spec.acs.map(ac),
        });
        for (const t of spec.tasks) {
          const tid = taskId++;
          newTasks.push(
            newTask(tid, t.col, sid, {
              title: t.title,
              description: t.description,
              points: t.points,
            }),
          );
        }
      }
      for (const t of a.looseTasks ?? []) {
        const tid = taskId++;
        newTasks.push(
          newTask(tid, t.col, null, {
            title: t.title,
            description: t.description,
            points: t.points,
          }),
        );
      }

      return {
        ...state,
        stories: [...state.stories, ...newStories],
        tasks: [...state.tasks, ...newTasks],
        taskOrder: [...state.taskOrder, ...newTasks.map((t) => t.id)],
        nextStoryId: storyId,
        nextTaskId: taskId,
      };
    }

    case "createTask": {
      const id = state.nextTaskId;
      const t = newTask(id, a.col, a.storyId, {
        title: a.title,
        description: a.description,
        points: a.points,
        acs: a.acs.map(ac),
      });
      return {
        ...state,
        tasks: [...state.tasks, t],
        taskOrder: [...state.taskOrder, id],
        nextTaskId: id + 1,
      };
    }

    case "deriveTasks": {
      let id = state.nextTaskId;
      const created: Task[] = a.tasks.map((spec) =>
        newTask(id++, spec.col, a.storyId, {
          title: spec.title,
          description: spec.description,
          points: spec.points,
        }),
      );
      return {
        ...state,
        tasks: [...state.tasks, ...created],
        taskOrder: [...state.taskOrder, ...created.map((t) => t.id)],
        nextTaskId: id,
      };
    }

    case "syncStory": {
      let id = state.nextTaskId;
      const created: Task[] = a.addTasks.map((spec) =>
        newTask(id++, spec.col, a.storyId, {
          title: spec.title,
          description: spec.description,
          points: spec.points,
        }),
      );
      let tasks = [...state.tasks, ...created];
      for (const { taskId, acs } of a.appendAcs) {
        const t = tasks.find((x) => x.id === taskId);
        if (t) tasks = patch(tasks, taskId, { acs: [...t.acs, ...acs.map(ac)] });
      }
      return {
        ...state,
        tasks,
        taskOrder: [...state.taskOrder, ...created.map((t) => t.id)],
        nextTaskId: id,
      };
    }

    case "appendTaskAcs": {
      const t = state.tasks.find((x) => x.id === a.taskId);
      if (!t) return state;
      return { ...state, tasks: patch(state.tasks, a.taskId, { acs: [...t.acs, ...a.acs.map(ac)] }) };
    }

    case "setTaskPoints":
      return { ...state, tasks: patch(state.tasks, a.taskId, { points: a.points }) };

    case "reorderTasks": {
      // nur bekannte IDs übernehmen, fehlende anhängen
      const known = new Set(state.tasks.map((t) => t.id));
      const wanted = a.order.filter((id) => known.has(id));
      const rest = state.taskOrder.filter((id) => !wanted.includes(id));
      return { ...state, taskOrder: [...wanted, ...rest] };
    }
  }
}

/** Nur den nach Firestore zu synchronisierenden Teil serialisieren. */
export function toPersist(state: AppState): PersistState {
  return {
    tasks: state.tasks,
    taskOrder: state.taskOrder,
    stories: state.stories,
    messages: state.messages,
    nextTaskId: state.nextTaskId,
    nextStoryId: state.nextStoryId,
    msgSeq: state.msgSeq,
  };
}

export type { Epic, Points };
