// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "PriceScrub AI",
  description:
    "Flipper-grade AI for finding real spreads in messy marketplaces.",
};

// ✅ Correct Next.js App Router viewport declaration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
