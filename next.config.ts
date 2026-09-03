import type { NextConfig } from "next";

/**
 * Content-Security-Policy — begrenzt, woher Skripte/Verbindungen kommen dürfen.
 * Zugelassen ist nur, was die App wirklich nutzt: Firebase (Auth, Firestore,
 * Analytics) und Google Fonts. Der Gemini-Aufruf läuft serverseitig und taucht
 * hier nicht auf.
 *
 * - 'unsafe-inline' bei style-src: die App nutzt durchgehend inline-`style`-Props
 *   (Organic Design System ohne CSS-Framework). Kein XSS-Risiko durch Styles.
 * - 'unsafe-inline' + 'unsafe-eval' bei script-src im Dev nötig (Fast Refresh);
 *   in Prod nur 'unsafe-inline' für die Next.js-Bootstrap-Snippets.
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://www.gstatic.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.google.com https://*.gstatic.com https://*.googleapis.com",
  [
    "connect-src 'self'",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://www.googleapis.com",
    "https://firebase.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://region1.google-analytics.com",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
  ].join(" "),
  "frame-src 'self' https://kanbanboard-cfc5c.firebaseapp.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Projekt-Root fixieren: verhindert, dass Turbopack eine package-lock.json
  // in einem übergeordneten Ordner als Root wählt (nur relevant fürs lokale Setup).
  turbopack: {
    root: __dirname,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
