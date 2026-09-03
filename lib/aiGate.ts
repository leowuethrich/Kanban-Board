import { AuthzError, usageGet, usageSet, type Caller } from "./firebaseAdmin";

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
 * bereits erreicht war. Kein transaktionaler Schutz (Firestore REST) — bei
 * exakt gleichzeitigen Anfragen kann eine zusätzliche durchrutschen. Für ein
 * Demo-Limit gegen Missbrauch ausreichend.
 */
export async function consumeQuota(
  caller: Caller,
): Promise<{ used: number; limit: number; owner: boolean }> {
  const owner = isOwner(caller);
  const limit = owner ? OWNER_DAILY_LIMIT : GUEST_DAILY_LIMIT;
  const day = today();

  const doc = await usageGet(caller.uid);
  const count = doc && doc.day === day ? doc.count ?? 0 : 0;

  if (count >= limit) {
    throw new AuthzError(
      "QUOTA_EXCEEDED",
      owner
        ? `Tageslimit erreicht (${limit}).`
        : `Demo-Limit erreicht: ${limit} AI-Aufrufe pro Tag. Morgen wieder — oder eigenes Board ohne AI weiternutzen.`,
    );
  }

  await usageSet(caller.uid, { day, count: count + 1, email: caller.email, owner });
  return { used: count + 1, limit, owner };
}
