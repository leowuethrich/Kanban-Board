import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { PersistState } from "./store";

const COLLECTION = "boards";

function isPersistState(v: unknown): v is PersistState {
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

function pickPersist(o: PersistState): PersistState {
  return {
    tasks: o.tasks,
    taskOrder: o.taskOrder,
    stories: o.stories,
    messages: o.messages,
    nextTaskId: o.nextTaskId,
    nextStoryId: o.nextStoryId,
    msgSeq: o.msgSeq,
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
