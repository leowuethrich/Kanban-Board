"use client";

import { useEffect, useRef, useState } from "react";
import type { ApplyAction, Message } from "@/lib/types";

type QuickKind = "prioritise" | "report" | "tidyUp";
const QUICK: { label: string; kind: QuickKind }[] = [
  { label: "Priorisieren", kind: "prioritise" },
  { label: "Sprint-Report", kind: "report" },
  { label: "Aufräumen", kind: "tidyUp" },
];

interface Props {
  messages: Message[];
  thinking: boolean;
  aiOn: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onQuick: (kind: QuickKind) => void;
  onApply: (action: ApplyAction) => void;
  onReset: () => void;
  onClose: () => void;
}

export function AiPanel({
  messages,
  thinking,
  aiOn,
  draft,
  onDraft,
  onSend,
  onQuick,
  onApply,
  onReset,
  onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [applied, setApplied] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking]);

  return (
    <aside
      style={{
        width: 380,
        flex: "none",
        borderLeft: "1px solid var(--color-divider)",
        background: "var(--color-neutral-100)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "var(--space-4) var(--space-4) var(--space-3)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "var(--color-accent-2-500)",
            display: "grid",
            placeItems: "center",
            color: "var(--color-accent-2-100)",
            fontFamily: "var(--font-heading)",
            fontSize: 14,
          }}
        >
          ai
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, lineHeight: 1.1 }}>
            Helfer
          </div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
            {aiOn ? "macht Stories & Tasks aus deiner Idee" : "nicht konfiguriert"}
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Gespräch leeren? Board und Stories bleiben erhalten.")) onReset();
          }}
          className="btn btn-ghost"
          style={{ padding: "4px 10px", fontSize: 12.5 }}
          title="Neues Gespräch"
        >
          Neu
        </button>
        <button onClick={onClose} className="btn btn-ghost" style={{ padding: "4px 10px" }}>
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        className="om-scroll"
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {messages.map((m) => {
          const isApplied = applied.has(m.id);
          return (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === "me" ? "flex-end" : "flex-start",
                maxWidth: "94%",
                background:
                  m.role === "me" ? "var(--color-accent-2-200)" : "var(--color-surface)",
                color: "var(--color-text)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                lineHeight: 1.5,
                animation: "om-in .25s ease both",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {m.title && (
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{m.title}</div>
              )}
              {m.text && <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}
              {m.lines && m.lines.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                  {m.lines.map((line, i) => (
                    <div key={i} style={{ display: "flex", gap: "var(--space-2)" }}>
                      <span style={{ color: "var(--color-accent-700)" }}>·</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              )}
              {m.applyLabel && m.apply && (
                <button
                  className="btn btn-primary"
                  disabled={isApplied}
                  onClick={() => {
                    if (isApplied || !m.apply) return;
                    setApplied((prev) => new Set(prev).add(m.id));
                    onApply(m.apply);
                  }}
                  style={{ alignSelf: "flex-start", padding: "5px 14px", fontSize: 13 }}
                >
                  {isApplied ? "Übernommen ✓" : m.applyLabel}
                </button>
              )}
            </div>
          );
        })}
        {thinking && (
          <div
            style={{
              alignSelf: "flex-start",
              fontSize: 14,
              color: "var(--color-neutral-600)",
              animation: "om-pulse 1.2s ease infinite",
            }}
          >
            denkt nach …
          </div>
        )}
      </div>

      <div
        style={{
          padding: "var(--space-3) var(--space-4) var(--space-4)",
          borderTop: "1px solid var(--color-divider)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
          {QUICK.map((q) => (
            <button
              key={q.kind}
              onClick={() => onQuick(q.kind)}
              className="ai-chip"
              disabled={!aiOn || thinking}
              style={{
                border: "1px solid var(--color-accent-2-400)",
                background: "transparent",
                color: "var(--color-accent-2-700)",
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 12.5,
                fontFamily: "var(--font-body)",
                cursor: aiOn && !thinking ? "pointer" : "not-allowed",
                opacity: aiOn && !thinking ? 1 : 0.5,
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
          <textarea
            className="input"
            placeholder={aiOn ? "Erzähl von deiner Idee …" : "AI nicht konfiguriert"}
            value={draft}
            disabled={!aiOn || thinking}
            rows={2}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            style={{ flex: 1, resize: "none", lineHeight: 1.4, minHeight: 0 }}
          />
          <button
            className="btn btn-primary"
            onClick={onSend}
            disabled={!aiOn || thinking}
            style={{ padding: "8px 16px" }}
          >
            ↑
          </button>
        </div>
      </div>
    </aside>
  );
}
