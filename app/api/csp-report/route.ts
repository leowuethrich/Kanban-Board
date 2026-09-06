/**
 * Nimmt CSP-Verstoß-Berichte des Browsers entgegen (Reporting-Endpoints-Header
 * in next.config.ts) und loggt sie. Kein Speichern in Firestore — das wäre für
 * ein paar Zeilen im Netlify-Log deutlich zu viel Aufwand; reicht, um bei
 * Bedarf (Nutzer meldet ein Problem) in den Function-Logs nachzuschauen, ob
 * die Policy etwas Legitimes blockiert hat.
 * Öffentlich erreichbar (Browser schicken Reports ohne Auth) — daher streng
 * gedeckelt in Größe und ungeloggt bei falschem Content-Type, damit der
 * Endpoint nicht als offener Free-Text-Logger missbraucht werden kann.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024;

export async function POST(req: Request) {
  const type = req.headers.get("content-type") || "";
  if (!/application\/(csp-report|reports\+json|json)/i.test(type)) {
    return new Response(null, { status: 204 });
  }
  const text = await req.text();
  if (text.length > MAX_BYTES) {
    return new Response(null, { status: 204 });
  }
  try {
    const parsed: unknown = JSON.parse(text);
    console.warn("CSP-Report:", JSON.stringify(parsed).slice(0, MAX_BYTES));
  } catch {
    // ungültiges JSON — ignorieren, nicht loggen
  }
  return new Response(null, { status: 204 });
}
