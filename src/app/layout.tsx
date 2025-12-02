import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PriceScrub",
  description: "Scrub the web for the lowest prices",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
