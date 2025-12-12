"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/company", label: "Company" },
    { href: "/#analyzer", label: "Product" },
    { href: "/solutions", label: "Solutions" },
    { href: "/pricing", label: "Pricing" },
    { href: "/resources", label: "Resources" },
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header
      style={{
        width: "100%",
        padding: "22px 16px",
        borderBottom: "1px solid rgba(148,163,184,0.20)",
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 42%, #f3f4f6 100%)",
        position: "relative",
        zIndex: 30,
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
        }}
      >
        {/* LOGO */}
        <Link
          href="/"
          onClick={closeMenu}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: -0.04,
              color: "#0f172a",
            }}
          >
            PriceScrub
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.18,
              textTransform: "uppercase",
              color: "#0f172a",
            }}
          >
            AI
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <div
          className="desktop-nav"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/login"
              style={{
                fontSize: 15,
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Log in
            </Link>

            <Link href="/signup">
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
                }}
              >
                Sign Up
              </button>
            </Link>
          </div>
        </div>

        {/* HAMBURGER (MOBILE ONLY) */}
        <button
          type="button"
          className="mobile-toggle"
          aria-label="Open navigation menu"
          onClick={() => setIsMobileMenuOpen(true)}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            padding: 6,
            cursor: "pointer",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span style={{ width: 24, height: 2, backgroundColor: "#0f172a", borderRadius: 999 }} />
          <span style={{ width: 24, height: 2, backgroundColor: "#0f172a", borderRadius: 999 }} />
          <span style={{ width: 24, height: 2, backgroundColor: "#0f172a", borderRadius: 999 }} />
        </button>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "radial-gradient(circle at top, #eef2ff 0, #f9fafb 42%, #f3f4f6 100%)",
            zIndex: 40,
            padding: "22px 20px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Mobile header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
            }}
          >
            <Link
              href="/"
              onClick={closeMenu}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>
                PriceScrub
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.18,
                  textTransform: "uppercase",
                  color: "#0f172a",
                }}
              >
                AI
              </span>
            </Link>

            <button
              onClick={closeMenu}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 28,
                cursor: "pointer",
                color: "#0f172a",
              }}
            >
              ×
            </button>
          </div>

          {/* Mobile links */}
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                style={{ textDecoration: "none", color: "#0f172a" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile auth */}
          <div style={{ marginTop: "auto" }}>
            <Link href="/login" onClick={closeMenu}>
              <button
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "#ffffff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 10px 28px rgba(15,23,42,0.12)",
                }}
              >
                Log in / Sign up
              </button>
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        .mobile-toggle {
          display: none;
        }

        @media (max-width: 900px) {
          .desktop-nav {
            display: none;
          }

          .mobile-toggle {
            display: inline-flex;
          }
        }
      `}</style>
    </header>
  );
}
