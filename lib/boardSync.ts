import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { PersistState } from "./store";

const COLLECTION = "boards";

function isPersistState(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.tasks) &&
    Array.isArray(o.taskOrder) &&
    Array.isArray(o.stories) &&
    Array.isArray(o.messages) &&
    typeof o.nextTaskId === "number" &&
    typeof o.nextStoryId === "number" &&
    typeof o.msgSeq === "number"
  );
}

/** Nur bekannte Felder übernehmen. Ältere Dokumente ohne chatMemory/
 *  archivedChats bekommen hier sinnvolle Defaults. */
function pickPersist(o: Record<string, unknown>): PersistState {
  return {
    tasks: o.tasks as PersistState["tasks"],
    taskOrder: o.taskOrder as number[],
    stories: o.stories as PersistState["stories"],
    messages: o.messages as PersistState["messages"],
    chatMemory: typeof o.chatMemory === "string" ? o.chatMemory : "",
    archivedChats: Array.isArray(o.archivedChats)
      ? (o.archivedChats as PersistState["archivedChats"])
      : [],
    nextTaskId: o.nextTaskId as number,
    nextStoryId: o.nextStoryId as number,
    msgSeq: o.msgSeq as number,
  };
}

/**
 * Live-Abo auf `boards/{uid}`.
 * - onData(null)  → Dokument existiert noch nicht (Aufrufer schreibt den Seed)
 * - onData(state) → aktueller Stand aus Firestore
 * Gibt eine Unsubscribe-Funktion zurück; bei fehlender Config eine No-op.
 */
export function subscribeBoard(
  uid: string,
  onData: (state: PersistState | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};
  const ref = doc(db, COLLECTION, uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData(isPersistState(data) ? pickPersist(data) : null);
    },
    (err) => onError?.(err),
  );
}

/** Board-Dokument überschreiben (merge:false → genau dieser Stand gilt).
 *  updatedAt setzt der Server, nicht der Client. */
export async function saveBoard(uid: string, state: PersistState): Promise<void> {
  const db = getDb();
  if (!db) return;
  await setDoc(doc(db, COLLECTION, uid), { ...state, updatedAt: serverTimestamp() });
}

/** Board-Dokument des Nutzers löschen (beim Konto-Löschen). */
export async function deleteBoard(uid: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, COLLECTION, uid));
}
