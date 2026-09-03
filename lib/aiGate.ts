import "server-only";
import { adminDb, AuthzError, type Caller } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/** Tageslimit für Gäste (Portfolio-Demo). Dein eigenes Konto ist ausgenommen. */
const GUEST_DAILY_LIMIT = Number(process.env.AI_GUEST_DAILY_LIMIT || 5);
const OWNER_DAILY_LIMIT = Number(process.env.AI_OWNER_DAILY_LIMIT || 100000);

function ownerEmail(): string {
  return (process.env.AI_OWNER_EMAIL || "").trim().toLowerCase();
}

export function isOwner(caller: Caller): boolean {
  const owner = ownerEmail();
  return owner !== "" && caller.email === owner;
}

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/**
 * Tageslimit pro Nutzer. Zählt EINEN Aufruf hoch und wirft, wenn das Limit
 * bereits erreicht war. Atomar über eine Firestore-Transaktion.
 * Owner: hohes Limit. Gäste: GUEST_DAILY_LIMIT.
 */
export async function consumeQuota(caller: Caller): Promise<{ used: number; limit: number; owner: boolean }> {
  const owner = isOwner(caller);
  const limit = owner ? OWNER_DAILY_LIMIT : GUEST_DAILY_LIMIT;

  const db = adminDb();
  const ref = db.collection("usage").doc(caller.uid);
  const day = today();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as { day?: string; count?: number }) : {};
    const count = data.day === day ? data.count ?? 0 : 0;

    if (count >= limit) {
      return { blocked: true as const, used: count };
    }
    tx.set(
      ref,
      {
        day,
        count: count + 1,
        email: caller.email,
        owner,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { blocked: false as const, used: count + 1 };
  });

  if (result.blocked) {
    throw new AuthzError(
      "QUOTA_EXCEEDED",
      owner
        ? `Tageslimit erreicht (${limit}).`
        : `Demo-Limit erreicht: ${limit} AI-Aufrufe pro Tag. Morgen wieder — oder eigenes Board ohne AI weiternutzen.`,
    );
  }
  return { used: result.used, limit, owner };
}
