"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TABS } from "@/lib/constants";
import { initialState, reducer } from "@/lib/store";
import { onAuthChange, signOutUser, type SessionUser } from "@/lib/auth";
import { useBoardSync } from "@/lib/useBoardSync";
import { AiError, aiReady, askAi } from "@/lib/aiClient";
import type { AiRequest, AiResult } from "@/lib/aiTypes";
import type { ApplyAction, ColId, View } from "@/lib/types";
import { LoginScreen } from "./LoginScreen";
import { OverviewView } from "./OverviewView";
import { BoardView } from "./BoardView";
import { StoriesView } from "./StoriesView";
import { SprintView } from "./SprintView";
import { TaskEditor } from "./TaskEditor";
import { StoryEditor } from "./StoryEditor";
import { AiPanel } from "./AiPanel";

const SYNC_LABEL: Record<string, string> = {
  connecting: "synchronisiert …",
  synced: "gespeichert",
  error: "offline — nicht gespeichert",
};

type AuthState = { status: "loading" } | { status: "out" } | { status: "in"; user: SessionUser };
type Editing = { kind: "task" | "story"; id: number } | null;

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  const [view, setView] = useState<View>("board");
  const [query, setQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(true);
  const [aiOn, setAiOn] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<ColId | null>(null);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const currentUser = auth.status === "in" ? auth.user : null;
  const syncStatus = useBoardSync({ uid: currentUser?.uid ?? null, state, dispatch });

  useEffect(() => {
    return onAuthChange((user) => setAuth(user ? { status: "in", user } : { status: "out" }));
  }, []);

  useEffect(() => {
    void aiReady().then(setAiOn);
  }, []);

  const orderedTasks = useMemo(() => {
    const byId = new Map(state.tasks.map((t) => [t.id, t]));
    let list = state.taskOrder
      .map((id) => byId.get(id))
      .filter((t): t is NonNullable<typeof t> => !!t);
    // Tasks ohne Order-Eintrag (Defensive) hinten anhängen
    for (const t of state.tasks) if (!state.taskOrder.includes(t.id)) list.push(t);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const story = state.stories.find((s) => s.id === t.storyId);
        return (t.title + " " + (story?.title ?? "") + " " + (story?.epic ?? ""))
          .toLowerCase()
          .includes(q);
      });
    }
    return list;
  }, [state.tasks, state.taskOrder, state.stories, query]);

  const editingTask =
    editing?.kind === "task" ? state.tasks.find((t) => t.id === editing.id) ?? null : null;
  const editingStory =
    editing?.kind === "story" ? state.stories.find((s) => s.id === editing.id) ?? null : null;

  // ── AI ────────────────────────────────────────────────────
  const pushMe = useCallback((text: string) => {
    dispatch({ type: "pushMessage", message: { role: "me", text } });
  }, []);

  const pushAiResult = useCallback((r: AiResult) => {
    dispatch({
      type: "pushMessage",
      message: {
        role: "ai",
        title: r.title,
        text: r.text,
        lines: r.bullets,
        applyLabel: r.apply ? r.applyLabel || "Übernehmen" : undefined,
        apply: r.apply,
      },
    });
  }, []);

  const runAi = useCallback(
    async (request: AiRequest, userEcho?: string) => {
      setAiOpen(true);
      if (userEcho) pushMe(userEcho);
      setThinking(true);
      try {
        const result = await askAi(request, stateRef.current);
        pushAiResult(result);
      } catch (e) {
        dispatch({
          type: "pushMessage",
          message: {
            role: "ai",
            title: "Fehler",
            text: e instanceof AiError ? e.message : "AI-Aufruf fehlgeschlagen.",
          },
        });
      } finally {
        setThinking(false);
      }
    },
    [pushMe, pushAiResult],
  );

  const send = useCallback(() => {
    const t = draft.trim();
    if (!t || thinking) return;
    setDraft("");
    const history = stateRef.current.messages
      .filter((m) => (m.text ?? "").trim())
      .slice(-24)
      .map((m) => ({ role: m.role, text: m.text as string }));
    void runAi({ kind: "chat", text: t, history }, t);
  }, [draft, thinking, runAi]);

  const resetChat = useCallback(() => {
    dispatch({ type: "resetChat" });
  }, []);

  const quickAction = useCallback(
    (kind: "prioritise" | "report" | "tidyUp") => {
      const label = { prioritise: "Priorisieren", report: "Sprint-Report", tidyUp: "Aufräumen" }[kind];
      void runAi({ kind } as AiRequest, label);
    },
    [runAi],
  );

  const applyAi = useCallback((action: ApplyAction) => {
    dispatch({ type: "applyAi", action });
    if (action.type === "ingest") {
      setView(action.stories.length ? "stories" : "board");
    }
    if (action.type === "deriveTasks" || action.type === "syncStory" || action.type === "reorderTasks") {
      setView("board");
    }
    if (action.type === "createTask") {
      setView("board");
    }
    if (action.type === "appendTaskAcs" && action.openEditor) {
      setEditing({ kind: "task", id: action.taskId });
    }
  }, []);

  // ── CRUD ──────────────────────────────────────────────────
  const addTask = useCallback((col: ColId) => {
    const id = stateRef.current.nextTaskId;
    dispatch({ type: "addTask", col, id });
    setEditing({ kind: "task", id });
  }, []);

  const addStory = useCallback(() => {
    const id = stateRef.current.nextStoryId;
    dispatch({ type: "addStory", id });
    setEditing({ kind: "story", id });
  }, []);

  function logout() {
    void signOutUser();
  }

  if (auth.status === "loading") {
    return <FullScreenNote>Lädt …</FullScreenNote>;
  }
  if (auth.status === "out") return <LoginScreen />;

  const initials = (auth.user.email.trim()[0] || "d").toUpperCase() + "K";
  const linkedTasks = editingStory
    ? state.tasks.filter((t) => t.storyId === editingStory.id)
    : [];

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-body)",
        color: "var(--color-text)",
        background: "var(--color-bg)",
        overflow: "hidden",
      }}
    >
      <header
        className="nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-6)",
          padding: "var(--space-3) var(--space-6)",
          flex: "none",
        }}
      >
        <div
          className="nav-brand"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              background: "var(--color-accent)",
              display: "grid",
              placeItems: "center",
              color: "var(--color-accent-100)",
              fontFamily: "var(--font-heading)",
              fontSize: 16,
            }}
          >
            k
          </div>
          <span>Krumen</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--space-1)",
            background: "var(--color-neutral-200)",
            padding: 4,
            borderRadius: 999,
          }}
        >
          {TABS.map((t) => {
            const active = view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className="tab-pill"
                style={{
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  padding: "7px 16px",
                  borderRadius: 999,
                  background: active ? "var(--color-accent)" : "transparent",
                  color: active ? "var(--color-accent-100)" : "var(--color-neutral-700)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>
          Projekt: Krumen Web
          {syncStatus !== "off" && SYNC_LABEL[syncStatus] && (
            <span
              style={{
                marginLeft: "var(--space-2)",
                fontSize: 12,
                color:
                  syncStatus === "error"
                    ? "var(--color-accent-700)"
                    : "var(--color-neutral-500)",
              }}
            >
              · {SYNC_LABEL[syncStatus]}
            </span>
          )}
        </span>
        <a
          href="/legal/datenschutz"
          style={{ fontSize: 12, color: "var(--color-neutral-600)", textDecoration: "none" }}
        >
          Datenschutz
        </a>
        <a
          href="/legal/impressum"
          style={{ fontSize: 12, color: "var(--color-neutral-600)", textDecoration: "none" }}
        >
          Impressum
        </a>
        <button
          className="btn btn-secondary"
          onClick={() => setAiOpen((v) => !v)}
          style={{ padding: "7px 16px" }}
        >
          {aiOpen ? "Helfer ausblenden" : "AI-Helfer"}
        </button>
        <button
          onClick={logout}
          title="Abmelden"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            border: 0,
            cursor: "pointer",
            background: "var(--color-accent-2-500)",
            color: "var(--color-accent-2-100)",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {initials}
        </button>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <main
          className="om-scroll"
          style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-6)" }}
        >
          {view === "overview" && <OverviewView tasks={state.tasks} stories={state.stories} />}
          {view === "board" && (
            <BoardView
              tasks={orderedTasks}
              stories={state.stories}
              query={query}
              onQuery={setQuery}
              onNewTask={() => addTask("backlog")}
              onAddTask={addTask}
              onOpen={(id) => setEditing({ kind: "task", id })}
              dragId={dragId}
              overCol={overCol}
              onDragStart={setDragId}
              onDragEnd={() => {
                setDragId(null);
                setOverCol(null);
              }}
              onDragOverCol={(col) => setOverCol((cur) => (cur === col ? cur : col))}
              onDragLeaveCol={(col) => setOverCol((cur) => (cur === col ? null : cur))}
              onDropCol={(col) => {
                if (dragId != null) dispatch({ type: "moveTask", id: dragId, col });
                setDragId(null);
                setOverCol(null);
              }}
            />
          )}
          {view === "stories" && (
            <StoriesView
              stories={state.stories}
              tasks={state.tasks}
              aiOn={aiOn}
              busy={thinking}
              onNewStory={addStory}
              onOpen={(id) => setEditing({ kind: "story", id })}
              onDerive={(storyId) => void runAi({ kind: "deriveTasks", storyId }, "Tasks ableiten")}
              onSync={(storyId) => void runAi({ kind: "syncStory", storyId }, "Mit Tasks abgleichen")}
            />
          )}
          {view === "sprint" && (
            <SprintView
              tasks={orderedTasks}
              stories={state.stories}
              onToggle={(id) => dispatch({ type: "toggleTaskSprint", id })}
              onOpen={(id) => setEditing({ kind: "task", id })}
            />
          )}
        </main>

        {aiOpen && (
          <AiPanel
            messages={state.messages}
            thinking={thinking}
            aiOn={aiOn}
            draft={draft}
            onDraft={setDraft}
            onSend={send}
            onQuick={quickAction}
            onApply={applyAi}
            onReset={resetChat}
            onClose={() => setAiOpen(false)}
          />
        )}
      </div>

      {editingTask && (
        <TaskEditor
          task={editingTask}
          stories={state.stories}
          onPatch={(patch) => dispatch({ type: "updateTask", id: editingTask.id, patch })}
          onAddAc={(text) => dispatch({ type: "addTaskAc", id: editingTask.id, text })}
          onToggleAc={(index) => dispatch({ type: "toggleTaskAc", id: editingTask.id, index })}
          onRemoveAc={(index) => dispatch({ type: "removeTaskAc", id: editingTask.id, index })}
          onAddComment={(text) => dispatch({ type: "addTaskComment", id: editingTask.id, text })}
          onDelete={() => {
            const id = editingTask.id;
            setEditing(null);
            dispatch({ type: "deleteTask", id });
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {editingStory && (
        <StoryEditor
          story={editingStory}
          linkedTasks={linkedTasks}
          aiOn={aiOn}
          busy={thinking}
          onPatch={(patch) => dispatch({ type: "updateStory", id: editingStory.id, patch })}
          onAddAc={(text) => dispatch({ type: "addStoryAc", id: editingStory.id, text })}
          onToggleAc={(index) => dispatch({ type: "toggleStoryAc", id: editingStory.id, index })}
          onRemoveAc={(index) => dispatch({ type: "removeStoryAc", id: editingStory.id, index })}
          onOpenTask={(id) => setEditing({ kind: "task", id })}
          onDerive={() => void runAi({ kind: "deriveTasks", storyId: editingStory.id }, "Tasks ableiten")}
          onSync={() => void runAi({ kind: "syncStory", storyId: editingStory.id }, "Mit Tasks abgleichen")}
          onDelete={() => {
            const id = editingStory.id;
            setEditing(null);
            dispatch({ type: "deleteStory", id });
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function FullScreenNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--color-bg)",
        color: "var(--color-neutral-600)",
        fontFamily: "var(--font-body)",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
