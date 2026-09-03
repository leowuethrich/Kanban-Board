import {
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import { deleteBoard } from "./boardSync";

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

/** Passwort-Reset-Mail anfordern (vom Login-Screen). */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError("Firebase ist nicht konfiguriert.");
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (e) {
    throw new AuthError(messageFor(e));
  }
}

/** Vor sensiblen Aktionen (Passwort ändern, Konto löschen) neu authentifizieren. */
async function reauth(currentPassword: string): Promise<User> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user || !user.email) throw new AuthError("Nicht angemeldet.");
  try {
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
  } catch (e) {
    throw new AuthError(messageFor(e));
  }
  return user;
}

/** Passwort ändern (verlangt das aktuelle Passwort). */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await reauth(currentPassword);
  try {
    await updatePassword(user, newPassword);
  } catch (e) {
    throw new AuthError(messageFor(e));
  }
}

/**
 * Konto endgültig löschen: erst das Board-Dokument in Firestore, dann den
 * Firebase-Auth-Nutzer. Verlangt das aktuelle Passwort (Firebase erzwingt
 * eine frische Anmeldung für deleteUser).
 */
export async function deleteAccount(currentPassword: string): Promise<void> {
  const user = await reauth(currentPassword);
  try {
    await deleteBoard(user.uid);
  } catch {
    // Board-Löschung nicht kritisch für den Konto-Abbau — weiter.
  }
  try {
    await deleteUser(user);
  } catch (e) {
    throw new AuthError(messageFor(e));
  }
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
    case "auth/requires-recent-login":
      return "Aus Sicherheitsgründen bitte neu anmelden und erneut versuchen.";
    default:
      return "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
  }
}
