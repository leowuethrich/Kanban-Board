import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { firebaseReady } from "./firebase";
import { saveBoard, subscribeBoard } from "./boardSync";
import type { Action, AppState } from "./store";
import { toPersist } from "./store";

export type SyncStatus = "off" | "connecting" | "synced" | "error";

interface Options {
  uid: string | null;
  state: AppState;
  dispatch: Dispatch<Action>;
}

const WRITE_DEBOUNCE_MS = 500;

/**
 * Bindet den Board-State an das Firestore-Dokument `boards/{uid}` des
 * angemeldeten Nutzers.
 * - Erstes Snapshot mit Daten  → hydrate
 * - Erstes Snapshot ohne Doc   → aktuellen (Seed-)Stand hochschreiben
 * - Spätere lokale Änderungen  → debounced zurückschreiben
 * - Eigene Writes echoen als Snapshot zurück und werden per Signatur ignoriert.
 * Ohne Firebase-Config oder ohne Anmeldung: Status "off" bzw. "connecting".
 */
export function useBoardSync({ uid, state, dispatch }: Options): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(firebaseReady ? "connecting" : "off");

  const ready = useRef(false); // erstes Snapshot verarbeitet?
  const lastSig = useRef<string>(""); // zuletzt geschriebene/gesehene Nutzlast
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Abo aufbauen (pro Nutzer) ---
  useEffect(() => {
    if (!firebaseReady || !uid) return;
    ready.current = false;

    const unsub = subscribeBoard(
      uid,
      (remote) => {
        if (!ready.current) {
          ready.current = true;
          if (remote) {
            lastSig.current = JSON.stringify(remote);
            dispatch({ type: "hydrate", payload: remote });
          } else {
            const seed = toPersist(state);
            lastSig.current = JSON.stringify(seed);
            void saveBoard(uid, seed).catch(() => setStatus("error"));
          }
          setStatus("synced");
          return;
        }
        // laufendes Update von außen (anderes Gerät / Tab)
        if (remote) {
          const sig = JSON.stringify(remote);
          if (sig !== lastSig.current) {
            lastSig.current = sig;
            dispatch({ type: "hydrate", payload: remote });
          }
        }
      },
      () => setStatus("error"),
    );

    return () => {
      unsub();
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
    // state bewusst NICHT in den Deps: der Seed-Write soll nur beim (Neu-)Abo
    // laufen. Laufende Änderungen schreibt der Effekt unten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, dispatch]);

  // --- lokale Änderungen zurückschreiben (debounced) ---
  useEffect(() => {
    if (!firebaseReady || !uid || !ready.current) return;
    const persist = toPersist(state);
    const sig = JSON.stringify(persist);
    if (sig === lastSig.current) return; // nichts Neues / eigenes Echo

    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      lastSig.current = sig;
      void saveBoard(uid, persist).catch(() => setStatus("error"));
    }, WRITE_DEBOUNCE_MS);
  }, [state, uid]);

  return status;
}
