import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — nur serverseitig. Credentials aus
 * FIREBASE_SERVICE_ACCOUNT (JSON, roh oder Base64) oder GOOGLE_APPLICATION_CREDENTIALS.
 */

function loadServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  try {
    const obj = JSON.parse(text) as Record<string, string>;
    if (obj.private_key) obj.private_key = obj.private_key.replace(/\\n/g, "\n");
    return obj;
  } catch {
    return null;
  }
}

let app: App | null = null;

export function adminApp(): App | null {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  const sa = loadServiceAccount();
  if (sa) {
    app = initializeApp({ credential: cert(sa as Parameters<typeof cert>[0]) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = initializeApp();
  } else {
    return null; // nicht konfiguriert
  }
  return app;
}

export const adminReady = () =>
  Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS);

export interface Caller {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Bearer-Token verifizieren. Wirft bei fehlend/ungültig und bei nicht
 * bestätigter E-Mail. Wenn App Check erzwungen ist, verlangt Firebase
 * zusätzlich einen gültigen App-Check-Token — dieser wird von der SDK
 * automatisch mitgeschickt; ein ungültiger führt hier zu BAD_TOKEN.
 */
export async function verifyCaller(req: Request): Promise<Caller> {
  const a = adminApp();
  if (!a) throw new AuthzError("SERVER_UNCONFIGURED", "Server nicht konfiguriert (Service-Account fehlt).");

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new AuthzError("NO_TOKEN", "Nicht angemeldet.");

  let decoded;
  try {
    decoded = await getAuth(a).verifyIdToken(token);
  } catch {
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

export function adminDb() {
  const a = adminApp();
  if (!a) throw new AuthzError("SERVER_UNCONFIGURED", "Server nicht konfiguriert.");
  return getFirestore(a);
}

export class AuthzError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
