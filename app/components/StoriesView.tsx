"use client";

import { tagClass } from "@/lib/constants";
import type { Task, UserStory } from "@/lib/types";

interface Props {
  stories: UserStory[];
  tasks: Task[];
  aiOn: boolean;
  busy: boolean;
  onNewStory: () => void;
  onOpen: (id: number) => void;
  onDerive: (storyId: number) => void;
  onSync: (storyId: number) => void;
}

export function StoriesView({
  stories,
  tasks,
  aiOn,
  busy,
  onNewStory,
  onOpen,
  onDerive,
  onSync,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        maxWidth: 900,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)" }}>
        <div>
          <div className="card-kicker">User Stories</div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--font-heading-weight)",
              fontSize: 36,
              margin: "var(--space-1) 0 0",
            }}
          >
            Anforderungen
          </h1>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={onNewStory}>
          Neue Story
        </button>
      </div>

      {!aiOn && (
        <div
          style={{
            fontSize: 13,
            color: "var(--color-accent-700)",
            background: "var(--color-accent-200)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
          }}
        >
          AI nicht konfiguriert — {"„Tasks ableiten\" / „Abgleichen\""} brauchen ANTHROPIC_API_KEY
          in .env.local.
        </div>
      )}

      {stories.length === 0 && (
        <div style={{ fontSize: 15, color: "var(--color-neutral-700)" }}>
          Noch keine User Stories. Leg eine an und lass die AI die Tasks daraus ableiten.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {stories.map((s) => {
          const linked = tasks.filter((t) => t.storyId === s.id);
          const doneAc = s.acs.filter((a) => a.done).length;
          return (
            <div
              key={s.id}
              className="card elev-sm"
              style={{
                padding: "var(--space-4)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span className={`tag ${tagClass(s.epic)}`} style={{ fontSize: 11 }}>
                  {s.epic}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--color-neutral-600)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.key}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>
                  {linked.length} Tasks · AK {doneAc}/{s.acs.length}
                </span>
              </div>

              <button
                onClick={() => onOpen(s.id)}
                className="link-btn"
                style={{
                  border: 0,
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-heading)",
                  fontSize: 19,
                  lineHeight: 1.25,
                  color: "var(--color-text)",
                }}
              >
                {s.title}
              </button>

              {s.story && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "var(--color-neutral-700)",
                  }}
                >
                  {s.story}
                </p>
              )}

              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onDerive(s.id)}
                  disabled={!aiOn || busy}
                  style={{ fontSize: 13, padding: "6px 14px" }}
                >
                  Tasks ableiten
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onSync(s.id)}
                  disabled={!aiOn || busy || linked.length === 0}
                  style={{ fontSize: 13, padding: "6px 14px" }}
                >
                  Mit Tasks abgleichen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
