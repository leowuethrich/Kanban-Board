import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ConsentBanner } from "./components/ConsentBanner";

export const metadata: Metadata = {
  title: "Krumen — Kanban & Projektplanung",
  description:
    "Portfolio-Demo: Kanban-Board mit User Stories, Sprint-Planung und einem Planungs-Assistenten, der aus einer Idee Stories und Backlog-Tasks macht.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom nicht sperren — Zugänglichkeit.
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
