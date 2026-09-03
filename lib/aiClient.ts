import { getFirebaseAuth } from "./firebase";
import type { AiRequest, AiResult } from "./aiTypes";
import type { AppState, PersistState } from "./store";
import { toPersist } from "./store";

export class AiError extends Error {}

/** Frisches Firebase-ID-Token des angemeldeten Nutzers. */
async function idToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/** Fragt den Server, ob die AI konfiguriert ist. */
export async function aiReady(): Promise<boolean> {
  try {
    const res = await fetch("/api/ai", { method: "GET" });
    const data = (await res.json()) as { ready?: boolean };
    return Boolean(data.ready);
  } catch {
    return false;
  }
}

/** Ruft /api/ai auf. API-Key bleibt serverseitig; ID-Token authentifiziert den Aufrufer. */
export async function askAi(request: AiRequest, state: AppState): Promise<AiResult> {
  const token = await idToken();
  if (!token) throw new AiError("Nicht angemeldet.");

  const board: PersistState = toPersist(state);
  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ request, board }),
    });
  } catch {
    throw new AiError("Keine Verbindung zum AI-Dienst.");
  }

  let data: { result?: AiResult; error?: string };
  try {
    data = (await res.json()) as { result?: AiResult; error?: string };
  } catch {
    throw new AiError("Ungültige Antwort vom AI-Dienst.");
  }

  if (!res.ok || !data.result) {
    throw new AiError(data.error || `AI-Fehler (${res.status}).`);
  }
  return data.result;
}
