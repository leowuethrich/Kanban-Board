import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Projekt-Root fixieren: verhindert, dass Turbopack eine package-lock.json
  // in einem übergeordneten Ordner als Root wählt (nur relevant fürs lokale Setup).
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
