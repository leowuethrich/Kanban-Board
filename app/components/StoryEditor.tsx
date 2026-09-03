"use client";

import { useState } from "react";
import { EPICS, colName, tagClass } from "@/lib/constants";
import type { Epic, Task, UserStory } from "@/lib/types";

interface Props {
  story: UserStory;
  linkedTasks: Task[];
  aiOn: boolean;
  busy: boolean;
  onPatch: (patch: Partial<UserStory>) => void;
  onAddAc: (text: string) => void;
  onToggleAc: (index: number) => void;
  onRemoveAc: (index: number) => void;
  onOpenTask: (id: number) => void;
  onDerive: () => void;
  onSync: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function StoryEditor({
  story,
  linkedTasks,
  aiOn,
  busy,
  onPatch,
  onAddAc,
  onToggleAc,
  onRemoveAc,
  onOpenTask,
  onDerive,
  onSync,
  onDelete,
  onClose,
}: Props) {
  const [acDraft, setAcDraft] = useState("");
  const doneAc = story.acs.filter((a) => a.done).length;

  function submitAc() {
    const t = acDraft.trim();
    if (!t) return;
    onAddAc(t);
    setAcDraft("");
  }

  return (
    <div
      className="dialog-backdrop"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "flex-end", zIndex: 40 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="om-scroll"
        style={{
          width: 560,
          maxWidth: "92vw",
          height: "100%",
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-lg)",
          overflow: "auto",
          padding: "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          animation: "om-in .2s ease both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span className={`tag ${tagClass(story.epic)}`}>{story.epic}</span>
          <span style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>{story.key}</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "4px 12px" }}>
            ✕
          </button>
        </div>

        <textarea
          className="input"
          value={story.title}
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

        <label
          className="field"
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", maxWidth: 200 }}
        >
          <span>Epic</span>
          <select
            className="input"
            value={story.epic}
            onChange={(e) => onPatch({ epic: e.target.value as Epic })}
          >
            {EPICS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>

        <label
          className="field"
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
        >
          <span>User Story</span>
          <textarea
            className="input"
            rows={3}
            value={story.story}
            onChange={(e) => onPatch({ story: e.target.value })}
            style={{ borderRadius: "var(--radius-md)", resize: "vertical", lineHeight: 1.5 }}
          />
        </label>

        {/* AI-Aktionen */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--color-neutral-100)",
            borderRadius: "var(--radius-md)",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--color-neutral-700)", flex: 1 }}>
            {aiOn
              ? "Lass die AI die Tasks für diese Story erzeugen oder mit den vorhandenen abgleichen."
              : "AI nicht konfiguriert (ANTHROPIC_API_KEY in .env.local)."}
          </span>
          <button
            className="btn btn-primary"
            onClick={onDerive}
            disabled={!aiOn || busy}
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            Tasks ableiten
          </button>
          <button
            className="btn btn-secondary"
            onClick={onSync}
            disabled={!aiOn || busy || linkedTasks.length === 0}
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            Mit Tasks abgleichen
          </button>
        </div>

        {/* Akzeptanzkriterien */}
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
              {doneAc} von {story.acs.length} erfüllt
            </span>
          </div>
          {story.acs.map((a, i) => (
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

        {/* Verknüpfte Tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: "var(--font-heading-weight)",
              fontSize: 19,
              margin: 0,
            }}
          >
            Tasks ({linkedTasks.length})
          </h3>
          {linkedTasks.length === 0 && (
            <span style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>
              Noch keine — {"„Tasks ableiten\""} lässt die AI welche vorschlagen.
            </span>
          )}
          {linkedTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTask(t.id)}
              className="link-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                border: 0,
                background: "var(--color-neutral-100)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                textAlign: "left",
                color: "var(--color-text)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-neutral-600)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t.key}
              </span>
              <span style={{ flex: 1 }}>{t.title}</span>
              <span style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                {colName(t.col)}
              </span>
              <span
                style={{
                  background: "var(--color-accent-200)",
                  color: "var(--color-accent-800)",
                  padding: "1px 9px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {t.points}
              </span>
            </button>
          ))}
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
            Story löschen
          </button>
        </div>
      </div>
    </div>
  );
}
