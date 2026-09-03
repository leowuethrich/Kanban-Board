import { GoogleGenAI } from "@google/genai";
import { aiResultSchema, applyActionSchema } from "@/lib/aiSchema";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/aiPrompt";
import { AuthzError, adminReady, verifyCaller } from "@/lib/firebaseAdmin";
import { consumeQuota } from "@/lib/aiGate";
import type { AiRequest } from "@/lib/aiTypes";
import type { PersistState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const HTTP_FOR_CODE: Record<string, number> = {
  SERVER_UNCONFIGURED: 503,
  NO_TOKEN: 401,
  BAD_TOKEN: 401,
  EMAIL_UNVERIFIED: 403,
  QUOTA_EXCEEDED: 429,
};

/** Ob die AI konfiguriert ist — für den Client-seitigen Gate. */
export async function GET() {
  try {
    return json({
      ready: Boolean(process.env.GEMINI_API_KEY) && adminReady(),
    });
  } catch {
    return json({ ready: false });
  }
}

interface Body {
  request: AiRequest;
  board: PersistState;
}

const MAX_BODY_BYTES = 256 * 1024; // Board-Kontext kann groß sein, aber nicht beliebig
const MAX_CHAT_TEXT = 4000;
const MAX_HISTORY = 30;

function validRequest(r: unknown): r is AiRequest {
  if (!r || typeof r !== "object") return false;
  const o = r as { kind?: unknown; history?: unknown; text?: unknown };
  const k = o.kind;
  if (
    k !== "deriveTasks" &&
    k !== "syncStory" &&
    k !== "estimate" &&
    k !== "prioritise" &&
    k !== "report" &&
    k !== "tidyUp" &&
    k !== "chat"
  ) {
    return false;
  }
  if (k === "chat") {
    if (typeof o.text !== "string" || o.text.length === 0 || o.text.length > MAX_CHAT_TEXT) return false;
    if (!Array.isArray(o.history) || o.history.length > MAX_HISTORY) return false;
  }
  return true;
}

function validBoard(b: unknown): b is PersistState {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  return (
    Array.isArray(o.tasks) &&
    o.tasks.length <= 500 &&
    Array.isArray(o.stories) &&
    o.stories.length <= 300 &&
    Array.isArray(o.taskOrder)
  );
}

/** Erstes {...}-Objekt aus einem Text ziehen (Gemini rahmt JSON gelegentlich ein). */
function extractJson(text: string): string {
  const t = text.trim();
  if (t.startsWith("{")) return t;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) return t.slice(first, last + 1);
  return t;
}

export async function POST(req: Request) {
  try {
    return await handlePost(req);
  } catch (e) {
    console.error("api/ai POST — unerwarteter Fehler:", e instanceof Error ? e.stack : e);
    return json({ error: "Interner Fehler beim AI-Aufruf." }, 500);
  }
}

async function handlePost(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "AI ist nicht konfiguriert (GEMINI_API_KEY fehlt)." }, 503);
  }

  // 1. Aufrufer verifizieren (Firebase ID-Token), 2. Tageslimit hochzählen.
  //    Gäste: kleines Kontingent. Dein eigenes Konto (AI_OWNER_EMAIL): praktisch frei.
  try {
    const caller = await verifyCaller(req);
    await consumeQuota(caller);
  } catch (e) {
    if (e instanceof AuthzError) {
      return json({ error: e.message }, HTTP_FOR_CODE[e.code] ?? 403);
    }
    return json({ error: "Zugriffsprüfung fehlgeschlagen." }, 500);
  }

  const rawText = await req.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return json({ error: "Anfrage zu groß." }, 413);
  }
  let body: Body;
  try {
    body = JSON.parse(rawText) as Body;
  } catch {
    return json({ error: "Ungültiger Request-Body." }, 400);
  }
  if (!validRequest(body.request) || !validBoard(body.board)) {
    return json({ error: "Request oder Board-Daten fehlen/ungültig." }, 400);
  }

  const ai = new GoogleGenAI({ apiKey });

  let raw: string;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt(body.request, body.board),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 8000,
      },
    });
    raw = response.text ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/api key not valid|API_KEY_INVALID|invalid api key/i.test(msg)) {
      return json({ error: "Gemini-API-Key ungültig — in .env.local prüfen." }, 502);
    }
    if (/quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) {
      return json({ error: "Gemini-Kontingent erschöpft. Bitte später erneut." }, 429);
    }
    if (/permission|PERMISSION_DENIED|not enabled|SERVICE_DISABLED/i.test(msg)) {
      return json(
        { error: "Gemini-Zugriff verweigert — Generative Language API im Google-Projekt aktivieren." },
        502,
      );
    }
    if (/not found|NOT_FOUND|no longer available/i.test(msg)) {
      return json({ error: `Gemini-Modell nicht verfügbar (${MODEL}). GEMINI_MODEL prüfen.` }, 502);
    }
    console.error("Gemini call failed:", msg);
    return json({ error: "Unerwarteter Fehler beim AI-Aufruf." }, 502);
  }

  if (!raw) {
    return json({ error: "Leere Antwort vom Modell." }, 502);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJson(raw));
  } catch {
    return json({ error: "Antwort des Modells war kein gültiges JSON." }, 502);
  }

  const full = aiResultSchema.safeParse(parsedJson);
  if (full.success) {
    return json({ result: full.data });
  }

  // Fallback: apply hat nicht validiert (häufig bei Freitext). Text/Bullets
  // trotzdem ausliefern, apply weglassen — besser als eine Fehlermeldung.
  const obj = (parsedJson ?? {}) as Record<string, unknown>;
  const applyParse = applyActionSchema.safeParse(obj.apply);
  const stripped = aiResultSchema.safeParse({ ...obj, apply: undefined, applyLabel: undefined });
  if (stripped.success) {
    console.warn(
      "AI-Antwort: apply verworfen —",
      applyParse.success ? "unbekannter Grund" : applyParse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    return json({ result: stripped.data });
  }

  console.warn(
    "AI-Antwort passte nicht zum Schema:",
    full.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  );
  return json({ error: "Antwort des Modells passte nicht zum Schema." }, 502);
}
