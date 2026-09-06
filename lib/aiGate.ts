import { AuthzError, usageTryIncrement, type Caller } from "./firebaseAdmin";

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

const MAX_CAS_ATTEMPTS = 5;

/**
 * Tageslimit pro Nutzer. Zählt EINEN Aufruf hoch und wirft, wenn das Limit
 * bereits erreicht war. Race-sicher: Lesen+Schreiben laufen als Compare-and-
 * Swap (usageTryIncrement) — bei gleichzeitigen Anfragen gewinnt genau eine,
 * die andere(n) versuchen mit dem neuen Stand erneut, statt das Limit zu
 * umgehen.
 */
export async function consumeQuota(
  caller: Caller,
): Promise<{ used: number; limit: number; owner: boolean }> {
  const owner = isOwner(caller);
  const limit = owner ? OWNER_DAILY_LIMIT : GUEST_DAILY_LIMIT;
  const day = today();

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const result = await usageTryIncrement(caller.uid, (current) => {
      const count = current && current.day === day ? current.count ?? 0 : 0;
      if (count >= limit) return { limitExceeded: count };
      return { day, count: count + 1, email: caller.email, owner };
    });

    if (result.ok) return { used: result.count, limit, owner };
    if (result.reason === "limit_exceeded") {
      throw new AuthzError(
        "QUOTA_EXCEEDED",
        owner
          ? `Tageslimit erreicht (${limit}).`
          : `Demo-Limit erreicht: ${limit} AI-Aufrufe pro Tag. Morgen wieder — oder eigenes Board ohne AI weiternutzen.`,
      );
    }
    // "conflict": eine gleichzeitige Anfrage hat zuerst geschrieben — erneut versuchen.
  }

  throw new AuthzError("SERVER_UNCONFIGURED", "Zähler momentan überlastet — bitte erneut versuchen.");
}
