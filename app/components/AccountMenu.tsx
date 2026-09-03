"use client";

import { useEffect, useRef, useState } from "react";
import { AuthError, changePassword, deleteAccount, signOutUser } from "@/lib/auth";

type Dialog = null | "password" | "delete";

export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const initials = (email.trim()[0] || "d").toUpperCase() + "K";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Konto"
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

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + var(--space-2))",
            minWidth: 240,
            background: "var(--color-surface)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            zIndex: 60,
            fontFamily: "var(--font-body)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--color-neutral-600)",
              padding: "var(--space-2) var(--space-3)",
              wordBreak: "break-all",
            }}
          >
            Angemeldet als
            <br />
            <strong style={{ color: "var(--color-text)" }}>{email}</strong>
          </div>
          <MenuItem onClick={() => { setOpen(false); setDialog("password"); }}>
            Passwort ändern
          </MenuItem>
          <MenuItem onClick={() => void signOutUser()}>Abmelden</MenuItem>
          <MenuItem
            danger
            onClick={() => { setOpen(false); setDialog("delete"); }}
          >
            Konto löschen …
          </MenuItem>
        </div>
      )}

      {dialog === "password" && <PasswordDialog onClose={() => setDialog(null)} />}
      {dialog === "delete" && <DeleteDialog email={email} onClose={() => setDialog(null)} />}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        border: 0,
        background: "transparent",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-sm)",
        color: danger ? "var(--color-accent-700)" : "var(--color-text)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "color-mix(in srgb, var(--color-text) 7%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dialog-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        zIndex: 80,
        padding: "var(--space-4)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card elev-lg"
        style={{
          width: "min(400px, 100%)",
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setMsg("");
    if (next.length < 8) return setMsg("Neues Passwort: mindestens acht Zeichen.");
    if (next !== next2) return setMsg("Die neuen Passwörter stimmen nicht überein.");
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (e) {
      setMsg(e instanceof AuthError ? e.message : "Ändern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Backdrop>
      <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 20, margin: 0 }}>
        Passwort ändern
      </h3>
      {done ? (
        <>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-700)" }}>
            Passwort geändert.
          </p>
          <button className="btn btn-primary" onClick={onClose} style={{ alignSelf: "flex-start" }}>
            Schließen
          </button>
        </>
      ) : (
        <>
          <Field label="Aktuelles Passwort" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
          <Field label="Neues Passwort" type="password" value={next} onChange={setNext} autoComplete="new-password" />
          <Field label="Neues Passwort wiederholen" type="password" value={next2} onChange={setNext2} autoComplete="new-password" />
          {msg && <ErrBox>{msg}</ErrBox>}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
              Ändern
            </button>
            <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Abbrechen
            </button>
          </div>
        </>
      )}
    </Backdrop>
  );
}

function DeleteDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    if (confirm.trim().toUpperCase() !== "LÖSCHEN") {
      return setMsg('Bitte „LÖSCHEN" eintippen, um zu bestätigen.');
    }
    setBusy(true);
    try {
      await deleteAccount(pw);
      // deleteUser meldet automatisch ab → onAuthChange in <App> zeigt Login.
    } catch (e) {
      setMsg(e instanceof AuthError ? e.message : "Löschen fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <Backdrop>
      <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 20, margin: 0, color: "var(--color-accent-700)" }}>
        Konto löschen
      </h3>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--color-neutral-700)" }}>
        Dein Konto <strong>{email}</strong> und dein Board (alle Stories, Tasks, Kommentare, der
        Chat-Verlauf) werden <strong>endgültig</strong> gelöscht. Das lässt sich nicht rückgängig
        machen.
      </p>
      <Field label="Passwort zur Bestätigung" type="password" value={pw} onChange={setPw} autoComplete="current-password" />
      <Field label={'Tippe „LÖSCHEN"'} type="text" value={confirm} onChange={setConfirm} />
      {msg && <ErrBox>{msg}</ErrBox>}
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          className="btn btn-primary"
          onClick={() => void submit()}
          disabled={busy}
          style={{ background: "var(--color-accent-700)" }}
        >
          {busy ? "Wird gelöscht …" : "Endgültig löschen"}
        </button>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Abbrechen
        </button>
      </div>
    </Backdrop>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: "text" | "password";
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="field" style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <span>{label}</span>
      <input
        className="input"
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ErrBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 14,
        color: "var(--color-accent-700)",
        background: "var(--color-accent-200)",
        padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {children}
    </div>
  );
}
