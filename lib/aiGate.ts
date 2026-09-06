import { AuthzError, usageTryConsume, type Caller, type UsageDoc } from "./firebaseAdmin";

/**
 * Mehrschichtiges Rate-Limiting für /api/ai. Ziel: echte Nutzung geht durch,
 * Bots/Skripte laufen sofort gegen die Wand.
 *
 * Alles wird pro Konto (uid) über eine gleitende Liste der letzten Aufruf-
 * Zeitstempel geführt (usage/{uid}.hits), plus ein globales Tageslimit über
 * ALLE Gäste (usage/__global__) gegen „100 Konten"-Angriffe.
 *
 * Werte per Env überschreibbar; die Defaults sind bewusst streng.
 */
const N = (key: string, def: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : def;
};

// Pro Gast-Konto
const GUEST_MIN_INTERVAL_MS = N("AI_GUEST_MIN_INTERVAL_S", 8) * 1000; // Mindestabstand zwischen zwei Aufrufen
const GUEST_PER_MIN = N("AI_GUEST_PER_MIN", 3);
const GUEST_PER_HOUR = N("AI_GUEST_PER_HOUR", 15);
const GUEST_PER_DAY = N("AI_GUEST_PER_DAY", 30);

// Betreiber-Konto (AI_OWNER_EMAIL) — großzügig, aber nicht unendlich
const OWNER_MIN_INTERVAL_MS = N("AI_OWNER_MIN_INTERVAL_S", 1) * 1000;
const OWNER_PER_MIN = N("AI_OWNER_PER_MIN", 20);
const OWNER_PER_HOUR = N("AI_OWNER_PER_HOUR", 200);
const OWNER_PER_DAY = N("AI_OWNER_PER_DAY", 500);

// Global über alle Gäste zusammen (Kostendeckel fürs ganze Projekt)
const GLOBAL_GUEST_PER_DAY = N("AI_GLOBAL_GUEST_PER_DAY", 300);

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const MAX_CAS_ATTEMPTS = 6;
const HITS_CAP = 400; // Liste beschneiden, damit das Dokument klein bleibt

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

interface Tier {
  minIntervalMs: number;
  perMin: number;
  perHour: number;
  perDay: number;
}

/** Prüft die gleitenden Fenster gegen `now`. Gibt eine Ablehnungsmeldung
 *  zurück oder null, wenn der Aufruf erlaubt ist. */
function windowDenial(hits: number[], now: number, t: Tier, owner: boolean): string | null {
  const last = hits.length ? hits[hits.length - 1] : 0;
  if (now - last < t.minIntervalMs) {
    const wait = Math.ceil((t.minIntervalMs - (now - last)) / 1000);
    return `Zu schnell hintereinander. Bitte ${wait} s warten.`;
  }
  const inMin = hits.filter((h) => now - h < MINUTE).length;
  if (inMin >= t.perMin) return "Zu viele Anfragen in kurzer Zeit. Kurz durchatmen und in einer Minute erneut.";
  const inHour = hits.filter((h) => now - h < HOUR).length;
  if (inHour >= t.perHour)
    return owner
      ? `Stundenlimit erreicht (${t.perHour}).`
      : "Stundenlimit für die Demo erreicht. Später erneut versuchen.";
  const inDay = hits.filter((h) => now - h < DAY).length;
  if (inDay >= t.perDay)
    return owner
      ? `Tageslimit erreicht (${t.perDay}).`
      : `Demo-Limit erreicht: ${t.perDay} AI-Aufrufe pro Tag. Morgen wieder — oder das Board ohne AI weiternutzen.`;
  return null;
}

function nextHits(hits: number[], now: number): number[] {
  // alles älter als ein Tag ist für keine Prüfung mehr relevant
  const pruned = hits.filter((h) => now - h < DAY);
  pruned.push(now);
  return pruned.length > HITS_CAP ? pruned.slice(-HITS_CAP) : pruned;
}

async function withRetry(fn: () => Promise<{ retry: boolean }>): Promise<void> {
  for (let i = 0; i < MAX_CAS_ATTEMPTS; i++) {
    const { retry } = await fn();
    if (!retry) return;
  }
  throw new AuthzError("SERVER_UNCONFIGURED", "Zähler momentan überlastet — bitte erneut versuchen.");
}

/**
 * Verbucht EINEN AI-Aufruf oder wirft AuthzError("QUOTA_EXCEEDED"/…), wenn
 * irgendeine Schicht greift. Reihenfolge bewusst: erst die kontobezogenen
 * Fenster (billig, fängt Bots sofort ab), erst danach der globale Gäste-
 * Zähler — so treibt ein hämmernder Bot den globalen Deckel nicht hoch, ohne
 * dass echte Gemini-Aufrufe passieren.
 */
export async function consumeQuota(caller: Caller): Promise<void> {
  const owner = isOwner(caller);
  const now = Date.now();
  const day = today();

  // 1) Konto-Fenster (Minute / Stunde / Tag / Mindestabstand)
  const tier: Tier = owner
    ? { minIntervalMs: OWNER_MIN_INTERVAL_MS, perMin: OWNER_PER_MIN, perHour: OWNER_PER_HOUR, perDay: OWNER_PER_DAY }
    : { minIntervalMs: GUEST_MIN_INTERVAL_MS, perMin: GUEST_PER_MIN, perHour: GUEST_PER_HOUR, perDay: GUEST_PER_DAY };

  await withRetry(async () => {
    const r = await usageTryConsume(caller.uid, (cur: UsageDoc) => {
      const denial = windowDenial(cur.hits, now, tier, owner);
      if (denial) return { deny: denial };
      const hits = nextHits(cur.hits, now);
      const count = cur.day === day ? cur.count + 1 : 1;
      return { day, count, hits, email: caller.email, owner };
    });
    if (r.ok) return { retry: false };
    if (r.reason === "conflict") return { retry: true };
    throw new AuthzError("QUOTA_EXCEEDED", r.message);
  });

  // 2) Globaler Gäste-Deckel (Kosten-Obergrenze fürs ganze Projekt)
  if (!owner) {
    await withRetry(async () => {
      const r = await usageTryConsume("__global__", (cur: UsageDoc) => {
        const count = cur.day === day ? cur.count : 0;
        if (count >= GLOBAL_GUEST_PER_DAY) {
          return { deny: "Die Demo ist heute stark ausgelastet. Bitte morgen erneut." };
        }
        return { day, count: count + 1, hits: [] };
      });
      if (r.ok) return { retry: false };
      if (r.reason === "conflict") return { retry: true };
      throw new AuthzError("QUOTA_EXCEEDED", r.message);
    });
  }
}
