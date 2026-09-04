"use client";

import { COLS, EPICS, tagClass } from "@/lib/constants";
import { MOBILE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import type { Task, UserStory } from "@/lib/types";

export function OverviewView({ tasks, stories }: { tasks: Task[]; stories: UserStory[] }) {
  const doneTasks = tasks.filter((t) => t.col === "done");
  const totalPts = tasks.reduce((n, t) => n + t.points, 0);
  const donePts = doneTasks.reduce((n, t) => n + t.points, 0);
  const openAcs = tasks.reduce((n, t) => n + t.acs.filter((a) => !a.done).length, 0);
  const donePct = totalPts ? Math.round((donePts / totalPts) * 100) : 0;

  const stats = [
    { value: stories.length, label: "User Stories" },
    { value: tasks.length, label: "Tasks" },
    { value: totalPts, label: "Story Points gesamt" },
    { value: doneTasks.length, label: "Tasks fertig" },
  ];

  const epicStats = EPICS.map((name) => {
    const storyIds = new Set(stories.filter((s) => s.epic === name).map((s) => s.id));
    const cs = tasks.filter((t) => t.storyId != null && storyIds.has(t.storyId));
    const d = cs.filter((t) => t.col === "done").length;
    return {
      name,
      tagClass: tagClass(name),
      pct: cs.length ? Math.round((d / cs.length) * 100) : 0,
      label: `${d} von ${cs.length} fertig`,
    };
  });

  const empty = tasks.length === 0 && stories.length === 0;
  const isMobile = useMediaQuery(MOBILE_QUERY);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: 1000,
      }}
    >
      <div>
        <div className="card-kicker">Übersicht</div>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: "var(--font-heading-weight)",
            fontSize: isMobile ? 28 : 40,
            margin: "var(--space-1) 0 0",
          }}
        >
          Krumen Web
        </h1>
      </div>

      {empty && (
        <div style={{ fontSize: 15, color: "var(--color-neutral-700)" }}>
          Noch nichts hier. Leg im Tab <strong>User Stories</strong> eine Story an und lass die AI
          die Tasks ableiten — oder erstelle direkt Aufgaben auf dem Board.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="card elev-sm"
            style={{ padding: "var(--space-4)", borderRadius: "var(--radius-lg)" }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 34, lineHeight: 1 }}>
              {s.value}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--color-neutral-700)",
                marginTop: "var(--space-1)",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
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
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--font-heading-weight)",
              fontSize: 20,
              margin: 0,
            }}
          >
            Fortschritt
          </h3>
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>
            {donePts} von {totalPts} Punkten erledigt
          </span>
        </div>
        <div
          style={{
            height: 14,
            borderRadius: 999,
            background: "var(--color-neutral-300)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              background: "var(--color-accent)",
              width: `${donePct}%`,
              transition: "width .4s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
            gap: "var(--space-3)",
            marginTop: "var(--space-2)",
          }}
        >
          {COLS.map((col) => {
            const count = tasks.filter((t) => t.col === col.id).length;
            return (
              <div
                key={col.id}
                style={{
                  borderLeft: "3px solid var(--color-accent-2-400)",
                  paddingLeft: "var(--space-2)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-neutral-600)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {col.name}
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        <div
          className="card elev-sm"
          style={{ padding: "var(--space-6)", borderRadius: "var(--radius-lg)" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--font-heading-weight)",
              fontSize: 20,
              margin: "0 0 var(--space-3)",
            }}
          >
            Epics
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {epicStats.map((ep) => (
              <div
                key={ep.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  flexWrap: isMobile ? "wrap" : "nowrap",
                }}
              >
                <span className={`tag ${ep.tagClass}`}>{ep.name}</span>
                <div
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "60%" : undefined,
                    height: 10,
                    borderRadius: 999,
                    background: "var(--color-neutral-300)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "var(--color-accent-2-500)",
                      width: `${ep.pct}%`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--color-neutral-700)",
                    width: isMobile ? "auto" : 90,
                    textAlign: "right",
                  }}
                >
                  {ep.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="card elev-sm"
          style={{ padding: "var(--space-6)", borderRadius: "var(--radius-lg)" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--font-heading-weight)",
              fontSize: 20,
              margin: "0 0 var(--space-3)",
            }}
          >
            Offene Akzeptanzkriterien
          </h3>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 34, lineHeight: 1 }}>
            {openAcs}
          </div>
          <p
            style={{
              margin: "var(--space-2) 0 0",
              fontSize: 14,
              color: "var(--color-neutral-700)",
            }}
          >
            über alle Tasks auf dem Board.
          </p>
        </div>
      </div>
    </div>
  );
}
