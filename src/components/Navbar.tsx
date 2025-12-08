"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header
      style={{
        width: "100%",
        padding: "22px 16px",
        borderBottom: "1px solid rgba(148,163,184,0.20)",

        // EXACT homepage background
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 42%, #f3f4f6 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {/* LOGO */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontSize: 32, // ⬆️ Increased for premium branding
              fontWeight: 800,
              letterSpacing: -0.04,
              color: "#0f172a",
            }}
          >
            PriceScrub
          </span>

          <span
            style={{
              fontSize: 13, // ⬆️ Slight increase for balance
              fontWeight: 700,
              letterSpacing: 0.18,
              textTransform: "uppercase",
              color: "#0f172a",
            }}
          >
            AI
          </span>
        </Link>

        {/* NAVIGATION + AUTH */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 32,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {/* Navigation */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              fontSize: 16,
              fontWeight: 500,
              flexWrap: "wrap",
            }}
          >
            {[
              { href: "/company", label: "Company" },
              { href: "/#analyzer", label: "Product" },
              { href: "/solutions", label: "Solutions" },
              { href: "/pricing", label: "Pricing" },
              { href: "/resources", label: "Resources" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: "#0f172a",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.12s ease",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* AUTH BUTTONS */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Link
              href="/login"
              style={{
                fontSize: 15,
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Log in
            </Link>

            <Link href="/signup" style={{ textDecoration: "none" }}>
              <button
                type="button"
                style={{
                  padding: "10px 24px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.45)",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
