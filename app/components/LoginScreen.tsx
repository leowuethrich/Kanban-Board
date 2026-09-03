"use client";

import { useState } from "react";
import { firebaseReady } from "@/lib/firebase";
import { AuthError, signIn } from "@/lib/auth";
import { SiteFooter } from "./SiteFooter";

// Kein Self-Signup mehr (nach Bot-Missbrauch). Konten werden in der Firebase
// Console angelegt: Authentication → Users → Add user.

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    if (!email.includes("@") || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // Erfolg: onAuthChange in <App> übernimmt den Rest.
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Anmeldung fehlgeschlagen.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-body)",
        color: "var(--color-text)",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.05fr .95fr",
        }}
      >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "var(--space-6)",
          padding: "72px 64px",
          maxWidth: 640,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "var(--color-accent)",
              display: "grid",
              placeItems: "center",
              color: "var(--color-accent-100)",
              fontFamily: "var(--font-heading)",
              fontSize: 20,
            }}
          >
            k
          </div>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>Krumen</span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: "var(--font-heading-weight)",
            fontSize: 52,
            lineHeight: 1.05,
            margin: 0,
            textWrap: "pretty",
          }}
        >
          Plane dein Projekt, ohne dich zu verzetteln.
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.5,
            margin: 0,
            maxWidth: "44ch",
            color: "var(--color-neutral-700)",
          }}
        >
          Board, User Stories und Sprints an einem Ort — mit einem Planungs-Assistenten, der aus
          deiner Idee im Chat Stories und Backlog-Tasks macht.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            fontSize: 16,
            color: "var(--color-neutral-700)",
          }}
        >
          <span>Kanban-Board mit Drag &amp; Drop über fünf Spalten</span>
          <span>User Stories mit Akzeptanzkriterien</span>
          <span>Sprint-Planung mit Kapazitätsanzeige</span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          placeItems: "center",
          padding: 48,
          background: "var(--color-accent-2-200)",
        }}
      >
        <form
          className="card elev-lg"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          style={{
            width: "100%",
            maxWidth: 380,
            padding: "var(--space-8)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <div className="card-kicker" style={{ marginBottom: "var(--space-1)" }}>
              Willkommen zurück
            </div>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: "var(--font-heading-weight)",
                fontSize: 28,
                margin: 0,
              }}
            >
              Anmelden
            </h2>
          </div>
          <label
            className="field"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
          >
            <span>E-Mail</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="du@beispiel.de"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
            />
          </label>
          <label
            className="field"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}
          >
            <span>Passwort</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
            />
          </label>
          {error && (
            <div
              style={{
                fontSize: 14,
                color: "var(--color-accent-700)",
                background: "var(--color-accent-200)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {error}
            </div>
          )}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading || !firebaseReady}
          >
            {loading ? "Einen Moment …" : "Anmelden"}
          </button>
          <div style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Passwort vergessen?
            </a>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--color-divider)",
              paddingTop: "var(--space-3)",
              fontSize: 13,
              color: "var(--color-neutral-600)",
              lineHeight: 1.5,
            }}
          >
            {firebaseReady
              ? "Portfolio-Demo — Zugang auf Anfrage beim Betreiber. Bitte keine echten oder vertraulichen Daten eingeben."
              : "Firebase ist nicht konfiguriert — .env.local prüfen."}
          </div>
        </form>
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}
