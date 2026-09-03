import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krumen — Kanban & Projektplanung",
  description:
    "Board, Backlog, User Storys und Sprints an einem Ort — mit einem AI-Helfer, der die Story schreibt, zerlegt und schätzt.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
