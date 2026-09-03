import {
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

// Kein Self-Signup (nach Bot-Missbrauch geschlossen). Konten legt der Betreiber
// in der Firebase Console an (Authentication → Users → Add user).
// Weiterhin aktiv:
// - E-Mail-Verifizierung ist Pflicht: ohne bestätigte Adresse kein App-Zugang
//   und keine AI-Nutzung (serverseitig geprüft in /api/ai)
// - Gäste-Rate-Limit pro Konto/Tag (lib/aiGate.ts)

export interface SessionUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export function toSessionUser(u: User | null): SessionUser | null {
  if (!u) return null;
  return { uid: u.uid, email: u.email ?? "", emailVerified: u.emailVerified };
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

/** Bestätigungsmail erneut senden (für den Verifizierungs-Screen). Wird
 *  gebraucht, wenn ein in der Console angelegtes Konto seine E-Mail noch
 *  bestätigen muss. */
export async function resendVerification(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new AuthError("Nicht angemeldet.");
  try {
    await sendEmailVerification(user);
  } catch (e) {
    throw new AuthError(messageFor(e));
  }
}

/** Token/Status neu laden — nachdem der Nutzer die Mail bestätigt hat. */
export async function refreshUser(): Promise<boolean> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return false;
  await user.reload();
  return user.emailVerified;
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
    case "auth/firebase-app-check-token-is-invalid":
    case "auth/app-check-token-invalid":
      return "Sicherheitsprüfung fehlgeschlagen. Seite neu laden und erneut versuchen.";
    default:
      return "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
  }
}
