"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ApplyAction, ArchivedChat, Message } from "@/lib/types";

type QuickKind = "prioritise" | "report" | "tidyUp";
const QUICK: { label: string; kind: QuickKind }[] = [
  { label: "Priorisieren", kind: "prioritise" },
  { label: "Sprint-Report", kind: "report" },
  { label: "Aufräumen", kind: "tidyUp" },
];

interface Props {
  messages: Message[];
  memory: string;
  archived: ArchivedChat[];
  thinking: boolean;
  aiOn: boolean;
  draft: string;
  mobile?: boolean;
  onDraft: (v: string) => void;
  onSend: () => void;
  onQuick: (kind: QuickKind) => void;
  onApply: (action: ApplyAction) => void;
  onReset: () => void;
  onRestore: (id: number) => void;
  onDeleteArchived: (id: number) => void;
  onClose: () => void;
}

function fmtTime(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hm = d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return hm;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" }) + " " + hm;
}

export function AiPanel({
  messages,
  memory,
  archived,
  thinking,
  aiOn,
  draft,
  mobile = false,
  onDraft,
  onSend,
  onQuick,
  onApply,
  onReset,
  onRestore,
  onDeleteArchived,
  onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [applied, setApplied] = useState<ReadonlySet<number>>(() => new Set());
  const [view, setView] = useState<"chat" | "history" | "memory">("chat");

  useEffect(() => {
    if (view !== "chat") return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking, view]);

  const hasMemory = memory.trim().length > 0;

  return (
    <aside
      style={{
        width: mobile ? "100%" : 380,
        flex: mobile ? 1 : "none",
        borderLeft: mobile ? "none" : "1px solid var(--color-divider)",
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
            flex: "none",
          }}
        >
          ai
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, lineHeight: 1.1 }}>
            Helfer
          </div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
            {aiOn ? "macht Stories & Tasks aus deiner Idee" : "nicht konfiguriert"}
          </div>
        </div>
        <button
          onClick={() => {
            if (
              confirm(
                "Neues Gespräch beginnen? Das laufende wird in den Verlauf abgelegt (nicht gelöscht). Board und Stories bleiben.",
              )
            ) {
              onReset();
              setView("chat");
            }
          }}
          className="btn btn-ghost"
          style={{ padding: "4px 10px", fontSize: 12.5 }}
          title="Aktuelles Gespräch ablegen und ein neues beginnen"
        >
          Neu
        </button>
        <button onClick={onClose} className="btn btn-ghost" style={{ padding: "4px 10px" }}>
          ✕
        </button>
      </div>

      {/* Umschalter Chat / Verlauf / Notiz */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "var(--space-2) var(--space-3) 0",
          fontSize: 12.5,
        }}
      >
        <Seg active={view === "chat"} onClick={() => setView("chat")}>
          Chat
        </Seg>
        <Seg active={view === "history"} onClick={() => setView("history")}>
          Verlauf{archived.length ? ` (${archived.length})` : ""}
        </Seg>
        <Seg active={view === "memory"} onClick={() => setView("memory")} dot={hasMemory}>
          Notiz
        </Seg>
      </div>

      {view === "chat" && (
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
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  alignItems: m.role === "me" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
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
                {m.at && (
                  <span style={{ fontSize: 10.5, color: "var(--color-neutral-500)" }}>
                    {fmtTime(m.at)}
                  </span>
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
      )}

      {view === "history" && (
        <HistoryView
          archived={archived}
          onRestore={(id) => {
            onRestore(id);
            setView("chat");
          }}
          onDelete={onDeleteArchived}
        />
      )}

      {view === "memory" && <MemoryView memory={memory} />}

      {view === "chat" && (
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
      )}
    </aside>
  );
}

function Seg({
  active,
  dot,
  onClick,
  children,
}: {
  active: boolean;
  dot?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 0,
        cursor: "pointer",
        background: active ? "var(--color-surface)" : "transparent",
        color: active ? "var(--color-text)" : "var(--color-neutral-600)",
        fontFamily: "var(--font-body)",
        fontWeight: active ? 700 : 500,
        fontSize: 12.5,
        padding: "5px 12px",
        borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {children}
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--color-accent-500)",
            display: "inline-block",
          }}
        />
      )}
    </button>
  );
}

function HistoryView({
  archived,
  onRestore,
  onDelete,
}: {
  archived: ArchivedChat[];
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
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
      {archived.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--color-neutral-600)", lineHeight: 1.5 }}>
          Noch keine abgelegten Gespräche. Mit <strong>Neu</strong> wird das laufende Gespräch hier
          abgelegt — es geht nichts verloren.
        </div>
      )}
      {archived.map((c) => {
        const firstUser = c.messages.find((m) => m.role === "me" && (m.text ?? "").trim());
        const preview = (firstUser?.text ?? c.messages[0]?.text ?? "Gespräch").trim();
        const count = c.messages.filter((m) => (m.text ?? "").trim()).length;
        return (
          <div
            key={c.id}
            className="card"
            style={{
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>
              {fmtTime(c.at)} · {count} Nachrichten
            </div>
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {preview}
            </div>
            {c.memory.trim() && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-neutral-600)",
                  borderLeft: "2px solid var(--color-accent-2-400)",
                  paddingLeft: "var(--space-2)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                Notiz: {c.memory.trim()}
              </div>
            )}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                className="btn btn-secondary"
                onClick={() => onRestore(c.id)}
                style={{ fontSize: 12.5, padding: "5px 12px" }}
              >
                Fortsetzen
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (confirm("Dieses abgelegte Gespräch endgültig löschen?")) onDelete(c.id);
                }}
                style={{ fontSize: 12.5, padding: "5px 10px", color: "var(--color-accent-700)" }}
              >
                Löschen
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemoryView({ memory }: { memory: string }) {
  const lines = useMemo(
    () => memory.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    [memory],
  );
  return (
    <div
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
      <div style={{ fontSize: 12.5, color: "var(--color-neutral-600)", lineHeight: 1.5 }}>
        Was sich der Helfer aus <em>diesem</em> Gespräch gemerkt hat. Er aktualisiert die Notiz nach
        jeder Antwort und bekommt sie bei jedem Aufruf mit. Sie stammt nur aus dem Chat — nichts vom
        Board fließt hier ein.
      </div>
      {lines.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-neutral-500)" }}>
          Noch nichts gemerkt. Schreib dem Helfer im Chat von deiner Idee.
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-2)", fontSize: 13.5, lineHeight: 1.5 }}>
              <span style={{ color: "var(--color-accent-700)" }}>·</span>
              <span>{l.replace(/^[-*·]\s*/, "")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
