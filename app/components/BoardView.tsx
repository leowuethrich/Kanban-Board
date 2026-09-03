"use client";

import { COLS, tagClass } from "@/lib/constants";
import type { ColId, Task, UserStory } from "@/lib/types";

interface Props {
  tasks: Task[]; // gefiltert + in globaler Reihenfolge
  stories: UserStory[];
  query: string;
  onQuery: (v: string) => void;
  onNewTask: () => void;
  onAddTask: (col: ColId) => void;
  onOpen: (id: number) => void;
  dragId: number | null;
  overCol: ColId | null;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDragOverCol: (col: ColId) => void;
  onDragLeaveCol: (col: ColId) => void;
  onDropCol: (col: ColId) => void;
}

export function BoardView({
  tasks,
  stories,
  query,
  onQuery,
  onNewTask,
  onAddTask,
  onOpen,
  dragId,
  overCol,
  onDragStart,
  onDragEnd,
  onDragOverCol,
  onDragLeaveCol,
  onDropCol,
}: Props) {
  const storyOf = (id: number | null) => (id == null ? null : stories.find((s) => s.id === id) ?? null);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", height: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)" }}>
        <div>
          <div className="card-kicker">Board</div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--font-heading-weight)",
              fontSize: 36,
              margin: "var(--space-1) 0 0",
            }}
          >
            Krumen Web
          </h1>
        </div>
        <div style={{ flex: 1 }} />
        <input
          className="input"
          placeholder="Aufgaben durchsuchen"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <button className="btn btn-primary" onClick={onNewTask}>
          Neue Aufgabe
        </button>
      </div>

      <div
        className="om-scroll"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(230px, 1fr))",
          gap: "var(--space-3)",
          alignItems: "start",
          overflowX: "auto",
          paddingBottom: "var(--space-3)",
        }}
      >
        {COLS.map((col) => {
          const cs = tasks.filter((t) => t.col === col.id);
          const over = overCol === col.id;
          const points = cs.reduce((n, t) => n + t.points, 0);
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                onDragOverCol(col.id);
              }}
              onDragLeave={() => onDragLeaveCol(col.id)}
              onDrop={(e) => {
                e.preventDefault();
                onDropCol(col.id);
              }}
              style={{
                background: over ? "var(--color-accent-200)" : "var(--color-neutral-200)",
                border: `2px dashed ${over ? "var(--color-accent-500)" : "transparent"}`,
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                minHeight: 220,
                transition: "background .15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 var(--space-1)",
                }}
              >
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{col.name}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-neutral-700)",
                    background: "var(--color-neutral-200)",
                    padding: "2px 10px",
                    borderRadius: 999,
                  }}
                >
                  {cs.length} · {points} P
                </span>
              </div>

              {cs.map((task) => {
                const story = storyOf(task.storyId);
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => onDragStart(task.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => onOpen(task.id)}
                    className="card board-card"
                    style={{
                      padding: "var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      cursor: "grab",
                      boxShadow: "var(--shadow-sm)",
                      opacity: dragId === task.id ? 0.4 : 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      {story ? (
                        <span className={`tag ${tagClass(story.epic)}`} style={{ fontSize: 11 }}>
                          {story.key}
                        </span>
                      ) : (
                        <span className="tag tag-neutral" style={{ fontSize: 11 }}>
                          ohne Story
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-neutral-600)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {task.key}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.35, textWrap: "pretty" }}>
                      {task.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        fontSize: 13,
                        color: "var(--color-neutral-700)",
                      }}
                    >
                      <span
                        style={{
                          background: "var(--color-accent-200)",
                          color: "var(--color-accent-800)",
                          padding: "1px 9px",
                          borderRadius: 999,
                          fontWeight: 700,
                        }}
                      >
                        {task.points}
                      </span>
                      <span>
                        AK {task.acs.filter((a) => a.done).length}/{task.acs.length}
                      </span>
                      <span>{task.comments.length} Komm.</span>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => onAddTask(col.id)}
                className="btn btn-ghost"
                style={{ justifyContent: "flex-start", fontSize: 14, padding: "6px var(--space-2)" }}
              >
                + Aufgabe
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
