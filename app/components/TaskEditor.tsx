"use client";

import { useState } from "react";
import { COLS, POINTS, tagClass } from "@/lib/constants";
import { MOBILE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import type { ColId, Points, Task, UserStory } from "@/lib/types";

interface Props {
  task: Task;
  stories: UserStory[];
  onPatch: (patch: Partial<Task>) => void;
  onAddAc: (text: string) => void;
  onToggleAc: (index: number) => void;
  onRemoveAc: (index: number) => void;
  onAddComment: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TaskEditor({
  task,
  stories,
  onPatch,
  onAddAc,
  onToggleAc,
  onRemoveAc,
  onAddComment,
  onDelete,
  onClose,
}: Props) {
  const [acDraft, setAcDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const doneAc = task.acs.filter((a) => a.done).length;
  const story = stories.find((s) => s.id === task.storyId) ?? null;

  function submitAc() {
    const t = acDraft.trim();
    if (!t) return;
    onAddAc(t);
    setAcDraft("");
  }
  function submitComment() {
    const t = commentDraft.trim();
    if (!t) return;
    onAddComment(t);
    setCommentDraft("");
  }

  return (
    <div
      className="dialog-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: isMobile ? "flex-end" : "stretch",
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="om-scroll"
        style={{
          width: isMobile ? "100%" : 560,
          maxWidth: isMobile ? "100%" : "92vw",
          height: isMobile ? "92vh" : "100%",
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-lg)",
          borderTopLeftRadius: isMobile ? "var(--radius-lg)" : 0,
          borderTopRightRadius: isMobile ? "var(--radius-lg)" : 0,
          overflow: "auto",
          padding: isMobile ? "var(--space-4) var(--space-4) var(--space-6)" : "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          animation: isMobile ? "om-sheet .22s ease both" : "om-in .2s ease both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {story ? (
            <span className={`tag ${tagClass(story.epic)}`}>{story.key}</span>
          ) : (
            <span className="tag tag-neutral">ohne Story</span>
          )}
          <span style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>{task.key}</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "4px 12px" }}>
            ✕
          </button>
        </div>

        <textarea
          className="input"
          value={task.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          rows={2}
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 26,
            lineHeight: 1.2,
            borderRadius: "var(--radius-md)",
            resize: "vertical",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
            gap: "var(--space-3)",
          }}
        >
          <label
            className="field"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
          >
            <span>Story Points</span>
            <select
              className="input"
              value={task.points}
              onChange={(e) => onPatch({ points: Number(e.target.value) as Points })}
            >
              {POINTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label
            className="field"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
          >
            <span>User Story</span>
            <select
              className="input"
              value={task.storyId ?? ""}
              onChange={(e) =>
                onPatch({ storyId: e.target.value === "" ? null : Number(e.target.value) })
              }
            >
              <option value="">— keine —</option>
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.key} · {s.title}
                </option>
              ))}
            </select>
          </label>
          <label
            className="field"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
          >
            <span>Spalte</span>
            <select
              className="input"
              value={task.col}
              onChange={(e) => onPatch({ col: e.target.value as ColId })}
            >
              {COLS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label
          className="field"
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
        >
          <span>Beschreibung</span>
          <textarea
            className="input"
            rows={3}
            value={task.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            style={{ borderRadius: "var(--radius-md)", resize: "vertical", lineHeight: 1.5 }}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: "var(--font-heading-weight)",
                fontSize: 19,
                margin: 0,
              }}
            >
              Akzeptanzkriterien
            </h3>
            <span style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>
              {doneAc} von {task.acs.length} erfüllt
            </span>
          </div>
          {task.acs.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-2)",
                background: "var(--color-neutral-100)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <button
                onClick={() => onToggleAc(i)}
                style={{
                  width: 22,
                  height: 22,
                  flex: "none",
                  marginTop: 2,
                  borderRadius: 999,
                  cursor: "pointer",
                  border: "2px solid var(--color-accent-2-500)",
                  background: a.done ? "var(--color-accent-2-500)" : "transparent",
                  color: "var(--color-accent-2-100)",
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {a.done ? "✓" : ""}
              </button>
              <span
                style={{
                  flex: 1,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: a.done ? "var(--color-neutral-600)" : "var(--color-text)",
                  textDecoration: a.done ? "line-through" : "none",
                }}
              >
                {a.text}
              </span>
              <button
                onClick={() => onRemoveAc(i)}
                className="btn btn-ghost"
                style={{ padding: "0 8px", fontSize: 13 }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              className="input"
              placeholder="Kriterium hinzufügen"
              value={acDraft}
              onChange={(e) => setAcDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitAc();
                }
              }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={submitAc}>
              +
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--font-heading-weight)",
              fontSize: 19,
              margin: 0,
            }}
          >
            Kommentare
          </h3>
          {task.comments.map((c, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: "var(--space-3)", fontSize: 14, lineHeight: 1.5 }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  flex: "none",
                  borderRadius: 999,
                  background: "var(--color-accent-2-300)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-accent-2-800)",
                }}
              >
                {c.who}
              </div>
              <div>
                <span style={{ color: "var(--color-neutral-600)", fontSize: 12 }}>{c.when}</span>
                <div>{c.text}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              className="input"
              placeholder="Kommentar schreiben"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitComment();
                }
              }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={submitComment}>
              Senden
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            borderTop: "1px solid var(--color-divider)",
            paddingTop: "var(--space-4)",
            marginTop: "auto",
          }}
        >
          <button className="btn btn-primary" onClick={onClose}>
            Fertig
          </button>
          <button
            className="btn btn-ghost"
            onClick={onDelete}
            style={{ color: "var(--color-accent-700)" }}
          >
            Aufgabe löschen
          </button>
        </div>
      </div>
    </div>
  );
}
