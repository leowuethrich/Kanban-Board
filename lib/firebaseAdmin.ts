import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";

/**
 * Serverseitige Firebase-Zugriffe OHNE firebase-admin.
 * Grund: firebase-admin (v14) scheitert im Netlify-Lambda beim verifyIdToken
 * (native/optionale Abhängigkeiten). Stattdessen:
 *  - ID-Token verifizieren: JWT-Verify gegen Googles securetoken-JWKS (jose)
 *  - Firestore-Zugriff (nur der usage-Zähler): Firestore-REST-API mit einem
 *    selbst signierten Service-Account-JWT als OAuth2-Assertion.
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  raw = raw.trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  const text = raw.startsWith("{")
    ? raw
    : Buffer.from(
        raw.replace(/[^A-Za-z0-9+/=_-]/g, "").replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8");
  try {
    const o = JSON.parse(text) as Record<string, string>;
    if (!o.project_id || !o.client_email || !o.private_key) return null;
    return {
      project_id: o.project_id,
      client_email: o.client_email,
      private_key: o.private_key.replace(/\\n/g, "\n"),
    };
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT parse:", (e as Error).message);
    return null;
  }
}

const SA = loadServiceAccount();
export const adminReady = () => Boolean(SA);

const PROJECT_ID = SA?.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

// ── ID-Token verifizieren ──────────────────────────────────────────────
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export interface Caller {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export async function verifyCaller(req: Request): Promise<Caller> {
  if (!PROJECT_ID) {
    throw new AuthzError("SERVER_UNCONFIGURED", "Server nicht konfiguriert.");
  }

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new AuthzError("NO_TOKEN", "Nicht angemeldet.");

  let payload: Record<string, unknown>;
  try {
    const res = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    payload = res.payload as Record<string, unknown>;
  } catch (e) {
    console.error("jwtVerify:", (e as Error).message);
    throw new AuthzError("BAD_TOKEN", "Anmeldung abgelaufen — neu einloggen.");
  }

  const uid = String(payload.sub || payload.user_id || "");
  if (!uid) throw new AuthzError("BAD_TOKEN", "Token ohne Nutzerkennung.");
  if (payload.email_verified !== true) {
    throw new AuthzError("EMAIL_UNVERIFIED", "Bitte zuerst die E-Mail-Adresse bestätigen.");
  }

  return { uid, email: String(payload.email || "").toLowerCase(), emailVerified: true };
}

// ── Firestore REST (nur für den usage-Zähler) ─────────────────────────
let cachedAccessToken: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (!SA) throw new AuthzError("SERVER_UNCONFIGURED", "Server nicht konfiguriert.");
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.exp - 60 > now) return cachedAccessToken.token;

  const key = await importPKCS8(SA.private_key, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(SA.client_email)
    .setSubject(SA.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    console.error("oauth token:", res.status, await res.text());
    throw new AuthzError("SERVER_UNCONFIGURED", "Firestore-Zugriff fehlgeschlagen.");
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = { token: j.access_token, exp: now + j.expires_in };
  return j.access_token;
}

const DOC_BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface UsageDoc {
  day?: string;
  count?: number;
}

/** Ein usage/{uid}-Dokument lesen. null wenn nicht vorhanden.
 *  updateTime (falls vorhanden) dient als Version für den CAS-Write unten. */
async function usageGetRaw(
  uid: string,
): Promise<{ data: UsageDoc; updateTime: string | null } | null> {
  const t = await accessToken();
  const res = await fetch(`${DOC_BASE()}/usage/${uid}`, {
    headers: { authorization: `Bearer ${t}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error("usageGet:", res.status, await res.text());
    throw new AuthzError("SERVER_UNCONFIGURED", "Zähler nicht lesbar.");
  }
  const j = (await res.json()) as {
    fields?: Record<string, { stringValue?: string; integerValue?: string }>;
    updateTime?: string;
  };
  const f = j.fields || {};
  return {
    data: {
      day: f.day?.stringValue,
      count: f.count?.integerValue ? Number(f.count.integerValue) : 0,
    },
    updateTime: j.updateTime ?? null,
  };
}

/** usage/{uid} per Compare-and-Swap schreiben: die Bedingung (Dokument fehlt
 *  bzw. exakt dieser updateTime) wird atomar in derselben :commit-Anfrage
 *  geprüft. Gibt false zurück, wenn der Stand inzwischen woanders geändert
 *  wurde (Aufrufer soll dann neu lesen und erneut versuchen). */
async function usageWriteIfUnchanged(
  uid: string,
  updateTime: string | null,
  data: { day: string; count: number; email: string; owner: boolean },
): Promise<boolean> {
  const t = await accessToken();
  const name = `projects/${PROJECT_ID}/databases/(default)/documents/usage/${uid}`;
  const write = {
    update: {
      name,
      fields: {
        day: { stringValue: data.day },
        count: { integerValue: String(data.count) },
        email: { stringValue: data.email },
        owner: { booleanValue: data.owner },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    },
    updateMask: { fieldPaths: ["day", "count", "email", "owner", "updatedAt"] },
    currentDocument: updateTime ? { updateTime } : { exists: false },
  };

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
      body: JSON.stringify({ writes: [write] }),
    },
  );
  if (res.status === 409 || res.status === 400) {
    // Vorbedingung verletzt (Dokument existiert bereits / hat sich geändert seit dem Lesen).
    const body = await res.text();
    if (/FAILED_PRECONDITION|ALREADY_EXISTS/i.test(body)) return false;
    console.error("usageWriteIfUnchanged:", res.status, body);
    throw new AuthzError("SERVER_UNCONFIGURED", "Zähler nicht schreibbar.");
  }
  if (!res.ok) {
    console.error("usageWriteIfUnchanged:", res.status, await res.text());
    throw new AuthzError("SERVER_UNCONFIGURED", "Zähler nicht schreibbar.");
  }
  return true;
}

export type UsageCasResult =
  | { ok: true; count: number }
  | { ok: false; reason: "limit_exceeded"; count: number }
  | { ok: false; reason: "conflict" };

/**
 * Ein Versuch, den Tageszähler für `uid` atomar um eins hochzuzählen: liest
 * den aktuellen Stand, lässt den Aufrufer daraus den neuen Wert berechnen
 * (oder das Limit erklären), und schreibt nur, wenn sich der Dokumentstand
 * seit dem Lesen nicht geändert hat (Compare-and-Swap statt read-then-write —
 * schließt die Lücke, durch die gleichzeitige Anfragen das Limit umgehen
 * konnten). Bei "conflict" soll der Aufrufer es erneut versuchen.
 */
export async function usageTryIncrement(
  uid: string,
  makeWrite: (
    current: UsageDoc | null,
  ) => { day: string; count: number; email: string; owner: boolean } | { limitExceeded: number },
): Promise<UsageCasResult> {
  const current = await usageGetRaw(uid);
  const decision = makeWrite(current?.data ?? null);
  if ("limitExceeded" in decision) {
    return { ok: false, reason: "limit_exceeded", count: decision.limitExceeded };
  }
  const ok = await usageWriteIfUnchanged(uid, current?.updateTime ?? null, decision);
  if (!ok) return { ok: false, reason: "conflict" };
  return { ok: true, count: decision.count };
}

/** usage/{uid} löschen (beim Konto-Löschen). Kein Fehler, wenn es nicht existiert. */
export async function usageDelete(uid: string): Promise<void> {
  const t = await accessToken();
  const res = await fetch(`${DOC_BASE()}/usage/${uid}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${t}` },
  });
  if (!res.ok && res.status !== 404) {
    console.error("usageDelete:", res.status, await res.text());
  }
}

export class AuthzError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
