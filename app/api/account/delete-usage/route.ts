import { AuthzError, usageDelete, verifyCaller } from "@/lib/firebaseAdmin";

/**
 * Räumt das eigene usage/{uid}-Dokument (AI-Tageszähler) auf. Wird beim
 * Konto-Löschen aus dem Client aufgerufen — die Firestore-Rules verbieten
 * Client-Schreibzugriff auf `usage/*` (der Server schreibt dort mit einem
 * Service-Account-Token, das die Rules umgeht), daher dieser Umweg über einen
 * eigenen, durch das ID-Token authentifizierten Endpoint statt eines direkten
 * Firestore-Zugriffs vom Client aus.
 * Nicht kritisch für den Konto-Abbau: schlägt es fehl, bleibt nur ein
 * verwaistes Zähler-Dokument zurück, kein Sicherheitsproblem.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
};

export async function POST(req: Request) {
  try {
    const caller = await verifyCaller(req);
    await usageDelete(caller.uid);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) {
      return json({ error: e.message }, HTTP_FOR_CODE[e.code] ?? 403);
    }
    console.error("api/account/delete-usage:", e instanceof Error ? e.stack : e);
    return json({ error: "Aufräumen fehlgeschlagen." }, 500);
  }
}
