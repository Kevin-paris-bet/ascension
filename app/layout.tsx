import type { Metadata, Viewport } from "next";
import { Manrope, Oswald } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ascension", template: "%s — Ascension" },
  description: "Chaque choix écrit ta carrière. Jusqu’où iras-tu ?",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060a0d",
};

const manrope = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${oswald.variable}`}>
      <body>{children}</body>
    </html>
  );
}
