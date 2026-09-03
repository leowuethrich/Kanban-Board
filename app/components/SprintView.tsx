"use client";

import { CAPACITY, colName, tagClass } from "@/lib/constants";
import type { Task, UserStory } from "@/lib/types";

interface Props {
  tasks: Task[]; // gefiltert + in globaler Reihenfolge
  stories: UserStory[];
  onToggle: (id: number) => void;
  onOpen: (id: number) => void;
}

export function SprintView({ tasks, stories, onToggle, onOpen }: Props) {
  const sprintPts = tasks.filter((t) => t.sprint).reduce((n, t) => n + t.points, 0);
  const over = sprintPts > CAPACITY;
  const pct = Math.min(100, Math.round((sprintPts / CAPACITY) * 100));
  const note = over
    ? `Überbucht um ${sprintPts - CAPACITY} Punkte — nimm eine Aufgabe heraus.`
    : `Noch ${CAPACITY - sprintPts} Punkte frei.`;
  const storyOf = (id: number | null) => (id == null ? null : stories.find((s) => s.id === id) ?? null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        maxWidth: 900,
      }}
    >
      <div>
        <div className="card-kicker">Sprint-Planung</div>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: "var(--font-heading-weight)",
            fontSize: 36,
            margin: "var(--space-1) 0 0",
          }}
        >
          Aktueller Sprint
        </h1>
      </div>

      <div
        className="card elev-sm"
        style={{
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 16 }}>Kapazität</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>
            {sprintPts} / {CAPACITY} Punkte
          </span>
        </div>
        <div
          style={{
            height: 16,
            borderRadius: 999,
            background: "var(--color-neutral-300)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              background: over ? "var(--color-accent-600)" : "var(--color-accent-2-500)",
              width: `${pct}%`,
              transition: "width .35s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>{note}</div>
      </div>

      {tasks.length === 0 && (
        <div style={{ fontSize: 15, color: "var(--color-neutral-700)" }}>
          Noch keine Aufgaben. Erstelle welche auf dem Board oder lass sie aus einer Story ableiten.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {tasks.map((t) => {
          const story = storyOf(t.storyId);
          return (
            <div
              key={t.id}
              className="card"
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "var(--space-3)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <button
                onClick={() => onToggle(t.id)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  flex: "none",
                  cursor: "pointer",
                  border: "2px solid var(--color-accent-500)",
                  background: t.sprint ? "var(--color-accent-500)" : "transparent",
                  color: "var(--color-accent-100)",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                {t.sprint ? "✓" : ""}
              </button>
              <span
                className={`tag ${story ? tagClass(story.epic) : "tag-neutral"}`}
                style={{ fontSize: 11 }}
              >
                {story ? story.key : "ohne Story"}
              </span>
              <button
                onClick={() => onOpen(t.id)}
                className="link-btn"
                style={{
                  flex: 1,
                  textAlign: "left",
                  border: 0,
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "var(--color-text)",
                }}
              >
                {t.title}
              </button>
              <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>
                {colName(t.col)}
              </span>
              <span
                style={{
                  background: "var(--color-accent-200)",
                  color: "var(--color-accent-800)",
                  padding: "1px 10px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t.points}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
