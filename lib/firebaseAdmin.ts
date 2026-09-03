import type { App } from "firebase-admin/app";

/**
 * Firebase Admin SDK — nur serverseitig, lazy geladen. Alle firebase-admin-
 * Imports passieren erst beim ersten Aufruf innerhalb der Funktion, damit ein
 * Bundling-/Init-Problem nicht das ganze Route-Modul beim Laden killt.
 * Credentials aus FIREBASE_SERVICE_ACCOUNT (JSON roh oder Base64).
 */

/**
 * FIREBASE_SERVICE_ACCOUNT robust parsen. Akzeptiert:
 *  - rohes JSON  ({ "type": "service_account", ... })
 *  - Base64 von JSON (auch mit Whitespace/Zeilenumbrüchen)
 *  - JSON in einfachen/doppelten Anführungszeichen
 */
function loadServiceAccount(): Record<string, string> | null {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  raw = raw.trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }

  let text: string;
  if (raw.startsWith("{")) {
    text = raw;
  } else {
    const b64 = raw.replace(/[^A-Za-z0-9+/=_-]/g, "").replace(/-/g, "+").replace(/_/g, "/");
    text = Buffer.from(b64, "base64").toString("utf8");
  }

  try {
    const obj = JSON.parse(text) as Record<string, string>;
    if (obj.private_key) obj.private_key = obj.private_key.replace(/\\n/g, "\n");
    return obj;
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT konnte nicht geparst werden:", (e as Error).message);
    return null;
  }
}

let appPromise: Promise<App | null> | null = null;

async function adminApp(): Promise<App | null> {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    try {
      const { cert, getApps, initializeApp } = await import("firebase-admin/app");
      if (getApps().length) return getApps()[0];
      const sa = loadServiceAccount();
      if (!sa) {
        console.error("Firebase Admin: kein Service-Account (FIREBASE_SERVICE_ACCOUNT fehlt/ungültig).");
        return null;
      }
      return initializeApp({ credential: cert(sa as Parameters<typeof cert>[0]) });
    } catch (e) {
      console.error("Firebase Admin init fehlgeschlagen:", (e as Error).stack || e);
      return null;
    }
  })();
  return appPromise;
}

export const adminReady = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);

export interface Caller {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/** Bearer-Token verifizieren. Wirft bei fehlend/ungültig und bei nicht
 *  bestätigter E-Mail. */
export async function verifyCaller(req: Request): Promise<Caller> {
  const a = await adminApp();
  if (!a) throw new AuthzError("SERVER_UNCONFIGURED", "Server nicht konfiguriert (Service-Account).");

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new AuthzError("NO_TOKEN", "Nicht angemeldet.");

  let decoded;
  try {
    const { getAuth } = await import("firebase-admin/auth");
    decoded = await getAuth(a).verifyIdToken(token);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.error("verifyIdToken fehlgeschlagen:", err.code || "", err.message || String(e));
    throw new AuthzError("BAD_TOKEN", "Anmeldung abgelaufen — neu einloggen.");
  }

  if (!decoded.email_verified) {
    throw new AuthzError("EMAIL_UNVERIFIED", "Bitte zuerst die E-Mail-Adresse bestätigen.");
  }

  return {
    uid: decoded.uid,
    email: (decoded.email || "").toLowerCase(),
    emailVerified: true,
  };
}

export async function adminDb() {
  const a = await adminApp();
  if (!a) throw new AuthzError("SERVER_UNCONFIGURED", "Server nicht konfiguriert.");
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(a);
}

export class AuthzError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
