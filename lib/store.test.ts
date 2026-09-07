import { describe, expect, it } from "vitest";
import { boardSnapshot, initialState, reducer, toPersist } from "./store";
import type { AppState } from "./store";
import type { ApplyAction, StorySpec, TaskSpec } from "./types";

const taskSpec = (over: Partial<TaskSpec> = {}): TaskSpec => ({
  title: "T",
  description: "",
  col: "backlog",
  points: 3,
  ...over,
});

const storySpec = (over: Partial<StorySpec> = {}): StorySpec => ({
  title: "S",
  story: "Als … möchte ich …",
  epic: "Board",
  acs: ["AK 1", "AK 2"],
  tasks: [taskSpec(), taskSpec({ title: "T2" })],
  ...over,
});

/** Frischer State mit ein bisschen Chat-Inhalt (so dass resetChat archiviert). */
function seeded(): AppState {
  let s = initialState();
  s = reducer(s, { type: "pushMessage", message: { role: "me", text: "hallo" } });
  s = reducer(s, { type: "pushMessage", message: { role: "ai", text: "hi" } });
  return s;
}

describe("reducer — Tasks", () => {
  it("addTask fügt Task + Order-Eintrag hinzu und zählt nextTaskId hoch", () => {
    const s0 = initialState();
    const s1 = reducer(s0, { type: "addTask", col: "backlog", id: s0.nextTaskId });
    expect(s1.tasks).toHaveLength(1);
    expect(s1.taskOrder).toEqual([s0.nextTaskId]);
    expect(s1.nextTaskId).toBe(s0.nextTaskId + 1);
    expect(s1.tasks[0].key).toBe("T-" + s0.nextTaskId);
  });

  it("deleteTask entfernt Task und seinen Order-Eintrag", () => {
    let s = initialState();
    s = reducer(s, { type: "addTask", col: "backlog", id: 1 });
    s = reducer(s, { type: "addTask", col: "backlog", id: 2 });
    s = reducer(s, { type: "deleteTask", id: 1 });
    expect(s.tasks.map((t) => t.id)).toEqual([2]);
    expect(s.taskOrder).toEqual([2]);
  });

  it("moveTask ändert nur die Spalte", () => {
    let s = initialState();
    s = reducer(s, { type: "addTask", col: "backlog", id: 1 });
    s = reducer(s, { type: "moveTask", id: 1, col: "done" });
    expect(s.tasks[0].col).toBe("done");
  });

  it("rankTaskUp / rankTaskDown vertauschen benachbarte Order-Einträge, Ränder no-op", () => {
    let s = initialState();
    for (const id of [1, 2, 3]) s = reducer(s, { type: "addTask", col: "backlog", id });
    s = reducer(s, { type: "rankTaskUp", id: 3 });
    expect(s.taskOrder).toEqual([1, 3, 2]);
    s = reducer(s, { type: "rankTaskUp", id: 1 }); // schon oben → unverändert
    expect(s.taskOrder).toEqual([1, 3, 2]);
    s = reducer(s, { type: "rankTaskDown", id: 2 }); // schon unten → unverändert
    expect(s.taskOrder).toEqual([1, 3, 2]);
  });

  it("toggleTaskSprint kippt das Sprint-Flag", () => {
    let s = initialState();
    s = reducer(s, { type: "addTask", col: "backlog", id: 1 });
    expect(s.tasks[0].sprint).toBe(false);
    s = reducer(s, { type: "toggleTaskSprint", id: 1 });
    expect(s.tasks[0].sprint).toBe(true);
  });

  it("Task-AC hinzufügen / abhaken / entfernen", () => {
    let s = initialState();
    s = reducer(s, { type: "addTask", col: "backlog", id: 1 });
    s = reducer(s, { type: "addTaskAc", id: 1, text: "Kriterium" });
    expect(s.tasks[0].acs).toEqual([{ text: "Kriterium", done: false }]);
    s = reducer(s, { type: "toggleTaskAc", id: 1, index: 0 });
    expect(s.tasks[0].acs[0].done).toBe(true);
    s = reducer(s, { type: "removeTaskAc", id: 1, index: 0 });
    expect(s.tasks[0].acs).toEqual([]);
  });

  it("unbekannte Task-ID ändert inhaltlich nichts", () => {
    const s = initialState();
    // updateTask/patch geben aus Bequemlichkeit ein neues (inhaltsgleiches) Objekt zurück
    expect(reducer(s, { type: "updateTask", id: 999, patch: { title: "x" } })).toEqual(s);
    // Guard-Zweige geben denselben State zurück
    expect(reducer(s, { type: "toggleTaskSprint", id: 999 })).toBe(s);
    expect(reducer(s, { type: "addTaskAc", id: 999, text: "x" })).toBe(s);
  });
});

describe("reducer — Stories", () => {
  it("addStory legt eine Story mit Key an", () => {
    const s0 = initialState();
    const s1 = reducer(s0, { type: "addStory", id: s0.nextStoryId });
    expect(s1.stories).toHaveLength(1);
    expect(s1.stories[0].key).toBe("US-" + s0.nextStoryId);
    expect(s1.nextStoryId).toBe(s0.nextStoryId + 1);
  });

  it("deleteStory behält verwaiste Tasks, löst aber die Verknüpfung", () => {
    let s = initialState();
    s = reducer(s, { type: "addStory", id: 1 });
    s = reducer(s, { type: "addTask", col: "backlog", id: 1, storyId: 1 });
    s = reducer(s, { type: "deleteStory", id: 1 });
    expect(s.stories).toHaveLength(0);
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0].storyId).toBeNull();
  });
});

describe("reducer — applyAi: ingest", () => {
  const ingest = (stories: StorySpec[], looseTasks: TaskSpec[] = []): ApplyAction => ({
    type: "ingest",
    stories,
    looseTasks,
  });

  it("erzeugt N Stories + verknüpfte Tasks in einem Rutsch, IDs fortlaufend", () => {
    const s0 = initialState();
    const s1 = reducer(s0, {
      type: "applyAi",
      action: ingest([storySpec({ title: "A" }), storySpec({ title: "B", tasks: [taskSpec()] })]),
    });
    expect(s1.stories.map((x) => x.title)).toEqual(["A", "B"]);
    // A hat 2 Tasks, B hat 1 Task
    expect(s1.tasks).toHaveLength(3);
    expect(s1.tasks.filter((t) => t.storyId === s1.stories[0].id)).toHaveLength(2);
    expect(s1.tasks.filter((t) => t.storyId === s1.stories[1].id)).toHaveLength(1);
    // taskOrder enthält alle neuen IDs
    expect(s1.taskOrder).toEqual(s1.tasks.map((t) => t.id));
    // Zähler stehen hinter dem letzten vergebenen Wert
    expect(s1.nextStoryId).toBe(s0.nextStoryId + 2);
    expect(s1.nextTaskId).toBe(s0.nextTaskId + 3);
  });

  it("looseTasks landen ohne Story (storyId null)", () => {
    const s1 = reducer(initialState(), {
      type: "applyAi",
      action: ingest([], [taskSpec({ title: "lose" })]),
    });
    expect(s1.stories).toHaveLength(0);
    expect(s1.tasks).toHaveLength(1);
    expect(s1.tasks[0].storyId).toBeNull();
  });

  it("ingest hängt an bestehende Daten an, ohne sie zu verlieren", () => {
    let s = initialState();
    s = reducer(s, { type: "addTask", col: "backlog", id: s.nextTaskId });
    const before = s.tasks.length;
    s = reducer(s, { type: "applyAi", action: ingest([storySpec({ tasks: [taskSpec()] })]) });
    expect(s.tasks.length).toBe(before + 1);
  });
});

describe("reducer — applyAi: weitere Aktionen", () => {
  it("createTask legt genau einen Task mit Feldern + ACs an", () => {
    const s = reducer(initialState(), {
      type: "applyAi",
      action: {
        type: "createTask",
        title: "Neu",
        description: "desc",
        col: "ready",
        points: 5,
        storyId: null,
        acs: ["a", "b"],
      },
    });
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({ title: "Neu", col: "ready", points: 5 });
    expect(s.tasks[0].acs).toEqual([
      { text: "a", done: false },
      { text: "b", done: false },
    ]);
  });

  it("reorderTasks übernimmt nur bekannte IDs und hängt fehlende hinten an", () => {
    let s = initialState();
    for (const id of [1, 2, 3]) s = reducer(s, { type: "addTask", col: "backlog", id });
    s = reducer(s, { type: "applyAi", action: { type: "reorderTasks", order: [3, 1, 999] } });
    expect(s.taskOrder).toEqual([3, 1, 2]);
  });

  it("setTaskPoints ändert nur die Punkte", () => {
    let s = initialState();
    s = reducer(s, { type: "addTask", col: "backlog", id: 1 });
    s = reducer(s, { type: "applyAi", action: { type: "setTaskPoints", taskId: 1, points: 13 } });
    expect(s.tasks[0].points).toBe(13);
  });

  it("deriveTasks hängt Tasks an eine bestehende Story", () => {
    let s = initialState();
    s = reducer(s, { type: "addStory", id: 1 });
    s = reducer(s, {
      type: "applyAi",
      action: { type: "deriveTasks", storyId: 1, tasks: [taskSpec(), taskSpec({ title: "x" })] },
    });
    expect(s.tasks).toHaveLength(2);
    expect(s.tasks.every((t) => t.storyId === 1)).toBe(true);
    expect(s.taskOrder).toEqual(s.tasks.map((t) => t.id));
  });
});

describe("reducer — Chat-Verlauf & Gedächtnis", () => {
  it("pushMessage stempelt Zeit, vergibt fortlaufende ID, zählt msgSeq hoch", () => {
    const s0 = initialState();
    const s1 = reducer(s0, { type: "pushMessage", message: { role: "me", text: "hi" } });
    const m = s1.messages[s1.messages.length - 1];
    expect(m.id).toBe(s0.msgSeq);
    expect(typeof m.at).toBe("number");
    expect(s1.msgSeq).toBe(s0.msgSeq + 1);
  });

  it("setChatMemory speichert die Notiz (auf Maximallänge gekürzt)", () => {
    const s = reducer(initialState(), { type: "setChatMemory", memory: "x".repeat(5000) });
    expect(s.chatMemory.length).toBe(4000);
  });

  it("resetChat archiviert das laufende Gespräch und startet leer", () => {
    let s = seeded();
    s = reducer(s, { type: "setChatMemory", memory: "gemerkt" });
    const s2 = reducer(s, { type: "resetChat" });
    expect(s2.archivedChats).toHaveLength(1);
    expect(s2.archivedChats[0].memory).toBe("gemerkt");
    expect(s2.chatMemory).toBe("");
    // neues Gespräch: nur die Begrüßung
    expect(s2.messages).toHaveLength(1);
    expect(s2.messages[0].role).toBe("ai");
  });

  it("resetChat auf einem leeren Gespräch archiviert nichts", () => {
    const s = reducer(initialState(), { type: "resetChat" });
    expect(s.archivedChats).toHaveLength(0);
  });

  it("restoreChat holt ein archiviertes Gespräch zurück und legt das aktuelle ab", () => {
    let s = seeded();
    s = reducer(s, { type: "setChatMemory", memory: "erste-notiz" });
    s = reducer(s, { type: "resetChat" }); // archiviert #1
    const archivedId = s.archivedChats[0].id;
    s = reducer(s, { type: "pushMessage", message: { role: "me", text: "zweites gespräch" } });

    const restored = reducer(s, { type: "restoreChat", id: archivedId });
    expect(restored.chatMemory).toBe("erste-notiz");
    expect(restored.messages.some((m) => m.text === "hallo")).toBe(true);
    // das zweite Gespräch ist jetzt archiviert, das erste nicht mehr
    expect(restored.archivedChats.some((c) => c.id === archivedId)).toBe(false);
    expect(restored.archivedChats.some((c) => c.messages.some((m) => m.text === "zweites gespräch"))).toBe(
      true,
    );
  });

  it("restoreChat mit unbekannter ID ist ein no-op", () => {
    const s = seeded();
    expect(reducer(s, { type: "restoreChat", id: 99999 })).toBe(s);
  });

  it("deleteArchivedChat entfernt genau einen Eintrag", () => {
    let s = seeded();
    s = reducer(s, { type: "resetChat" });
    const id = s.archivedChats[0].id;
    s = reducer(s, { type: "deleteArchivedChat", id });
    expect(s.archivedChats).toHaveLength(0);
  });
});

describe("reducer — Undo-Schnappschuss", () => {
  it("restoreSnapshot stellt den Daten-Teil wieder her, lässt den Chat unberührt", () => {
    let s = initialState();
    s = reducer(s, { type: "addTask", col: "backlog", id: 1 });
    s = reducer(s, { type: "addStory", id: 1 });
    const snap = boardSnapshot(s);

    // destruktive Änderung + Chat-Aktivität danach
    s = reducer(s, { type: "deleteTask", id: 1 });
    s = reducer(s, { type: "deleteStory", id: 1 });
    s = reducer(s, { type: "pushMessage", message: { role: "me", text: "nach dem Löschen" } });

    const restored = reducer(s, { type: "restoreSnapshot", snapshot: snap });
    expect(restored.tasks).toHaveLength(1);
    expect(restored.stories).toHaveLength(1);
    // Chat NICHT zurückgerollt
    expect(restored.messages.some((m) => m.text === "nach dem Löschen")).toBe(true);
  });

  it("boardSnapshot enthält keine Chat-Felder", () => {
    const snap = boardSnapshot(seeded());
    expect(snap).not.toHaveProperty("messages");
    expect(snap).not.toHaveProperty("chatMemory");
    expect(Object.keys(snap).sort()).toEqual(
      ["nextStoryId", "nextTaskId", "stories", "taskOrder", "tasks"].sort(),
    );
  });
});

describe("hydrate & toPersist", () => {
  it("hydrate setzt Defaults für Felder, die ältere Dokumente nicht kennen", () => {
    const s = reducer(initialState(), {
      type: "hydrate",
      // absichtlich ohne chatMemory / archivedChats / messages
      payload: {
        tasks: [],
        taskOrder: [],
        stories: [],
        nextTaskId: 7,
        nextStoryId: 3,
        msgSeq: 42,
      } as never,
    });
    expect(s.chatMemory).toBe("");
    expect(s.archivedChats).toEqual([]);
    expect(s.messages).toHaveLength(1); // Begrüßung als Fallback
    expect(s.nextTaskId).toBe(7);
  });

  it("toPersist spiegelt genau die synchronisierten Felder", () => {
    const p = toPersist(seeded());
    expect(Object.keys(p).sort()).toEqual(
      [
        "archivedChats",
        "chatMemory",
        "messages",
        "msgSeq",
        "nextStoryId",
        "nextTaskId",
        "stories",
        "taskOrder",
        "tasks",
      ].sort(),
    );
  });
});
