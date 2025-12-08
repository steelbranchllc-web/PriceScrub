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
      className="navbar-root"
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
        className="navbar-inner"
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "nowrap",
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
          onClick={closeMenu}
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

        {/* DESKTOP NAV + AUTH */}
        <div
          className="navbar-right-desktop"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 32,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <nav
            className="navbar-links-desktop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              fontSize: 16,
              fontWeight: 500,
              flexWrap: "wrap",
            }}
          >
            {navItems.map((item) => (
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

          <div
            className="navbar-auth-desktop"
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

        {/* MOBILE HAMBURGER (display controlled by CSS) */}
        <button
          type="button"
          className="navbar-toggle"
          aria-label="Open navigation menu"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            padding: 8,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              display: "block",
              width: 20,
              height: 2,
              borderRadius: 999,
              backgroundColor: "#0f172a",
              marginBottom: 4,
            }}
          />
          <span
            style={{
              display: "block",
              width: 20,
              height: 2,
              borderRadius: 999,
              backgroundColor: "#0f172a",
              marginBottom: 4,
            }}
          />
          <span
            style={{
              display: "block",
              width: 20,
              height: 2,
              borderRadius: 999,
              backgroundColor: "#0f172a",
            }}
          />
        </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="navbar-mobile-menu"
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
          {/* Header row in mobile menu */}
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
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                textDecoration: "none",
              }}
              onClick={closeMenu}
            >
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: -0.04,
                  color: "#0f172a",
                }}
              >
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
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation menu"
              style={{
                background: "transparent",
                border: "none",
                padding: 6,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 26,
                  lineHeight: 1,
                  color: "#0f172a",
                }}
              >
                ×
              </span>
            </button>
          </div>

          {/* Links */}
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              fontSize: 20,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                style={{
                  textDecoration: "none",
                  color: "#0f172a",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Auth buttons pinned toward bottom */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <Link
              href="/login"
              onClick={closeMenu}
              style={{
                fontSize: 16,
                textDecoration: "none",
                color: "#0f172a",
                fontWeight: 500,
              }}
            >
              Log in
            </Link>

            <Link href="/signup" onClick={closeMenu}>
              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 10px 28px rgba(15,23,42,0.12)",
                }}
              >
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Desktop defaults */
        .navbar-toggle {
          display: none;
        }

        @media (max-width: 900px) {
          .navbar-right-desktop {
            display: none;
          }

          .navbar-toggle {
            display: inline-flex;
          }
        }
      `}</style>
    </header>
  );
}
