import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

// Signup ist offen (Portfolio-Demo). Kostenschutz gegen Missbrauch läuft
// serverseitig über ein hartes Tages-Rate-Limit für Gäste (lib/aiGate.ts).

export interface SessionUser {
  uid: string;
  email: string;
}

export function toSessionUser(u: User | null): SessionUser | null {
  if (!u) return null;
  return { uid: u.uid, email: u.email ?? "" };
}

/** Abo auf den Anmeldestatus. No-op ohne Config (Callback bekommt null). */
export function onAuthChange(cb: (user: SessionUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(toSessionUser(u)));
}

export async function signIn(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError("Firebase ist nicht konfiguriert.");
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (e) {
    throw new AuthError(messageFor(e));
  }
}

export async function signUp(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError("Firebase ist nicht konfiguriert.");
  try {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  } catch (e) {
    throw new AuthError(messageFor(e));
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export class AuthError extends Error {}

function messageFor(e: unknown): string {
  const code =
    typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-email":
      return "Die E-Mail-Adresse ist ungültig.";
    case "auth/missing-password":
      return "Bitte ein Passwort eingeben.";
    case "auth/weak-password":
      return "Das Passwort ist zu kurz (mindestens sechs Zeichen).";
    case "auth/email-already-in-use":
      return "Für diese E-Mail existiert bereits ein Konto.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-Mail oder Passwort stimmt nicht.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
    case "auth/network-request-failed":
      return "Keine Verbindung zu Firebase. Netzwerk prüfen.";
    case "auth/operation-not-allowed":
      return "E-Mail/Passwort-Anmeldung ist im Firebase-Projekt nicht aktiviert.";
    default:
      return "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
  }
}
