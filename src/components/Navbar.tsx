"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Company", href: "#company" },
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header className="ps-navbar">
        <div className="ps-navbar-inner">
          {/* Logo */}
          <Link href="/" className="ps-navbar-logo">
            <span className="ps-navbar-logo-main">PriceScrub</span>
            <span className="ps-navbar-logo-ai">AI</span>
          </Link>

          {/* Desktop links */}
          <nav className="ps-navbar-links">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="ps-navbar-link">
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="ps-navbar-actions">
            <button className="ps-navbar-login" type="button">
              Log in
            </button>
            <button className="ps-navbar-signup" type="button">
              Sign Up
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="ps-navbar-toggle"
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {!isOpen ? (
              <span className="ps-navbar-toggle-icon">
                <span className="ps-line" />
                <span className="ps-line" />
                <span className="ps-line" />
              </span>
            ) : (
              <span className="ps-navbar-toggle-close">×</span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="ps-mobile-menu">
          <div className="ps-mobile-menu-inner">
            <div className="ps-mobile-top">
              <Link href="/" className="ps-navbar-logo">
                <span className="ps-navbar-logo-main">PriceScrub</span>
                <span className="ps-navbar-logo-ai">AI</span>
              </Link>
              <button
                type="button"
                className="ps-mobile-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className="ps-mobile-links">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="ps-mobile-link"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="ps-mobile-footer">
              <button
                type="button"
                className="ps-mobile-auth"
                // later you can route this to a real auth page
                onClick={() => setIsOpen(false)}
              >
                Log in / Sign up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped styles */}
      <style jsx>{`
        .ps-navbar {
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 40;
          background: linear-gradient(to bottom right, #f8faff, #eef2ff);
          border-bottom: 1px solid rgba(15, 23, 42, 0.04);
        }

        .ps-navbar-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .ps-navbar-logo {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
          text-decoration: none;
        }

        .ps-navbar-logo-main {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #020617;
        }

        .ps-navbar-logo-ai {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6b7280;
        }

        .ps-navbar-links {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .ps-navbar-link {
          font-size: 14px;
          color: #111827;
          text-decoration: none;
          padding: 4px 0;
        }

        .ps-navbar-link:hover {
          color: #0f766e;
        }

        .ps-navbar-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .ps-navbar-login {
          background: transparent;
          border: none;
          font-size: 14px;
          color: #111827;
          cursor: pointer;
        }

        .ps-navbar-signup {
          border-radius: 999px;
          padding: 8px 18px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #0f172a;
          color: #f9fafb;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .ps-navbar-signup:hover {
          background: #020617;
        }

        /* Hamburger button */
        .ps-navbar-toggle {
          display: none;
          border: none;
          background: transparent;
          padding: 6px;
          cursor: pointer;
        }

        .ps-navbar-toggle-icon {
          display: inline-flex;
          flex-direction: column;
          justify-content: space-between;
          width: 22px;
          height: 16px;
        }

        .ps-line {
          height: 2px;
          border-radius: 999px;
          background-color: #020617;
        }

        .ps-navbar-toggle-close {
          display: inline-block;
          font-size: 26px;
          line-height: 1;
          color: #020617;
        }

        /* Mobile menu overlay */
        .ps-mobile-menu {
          position: fixed;
          inset: 0;
          z-index: 30;
          background: radial-gradient(circle at top, #f8fafc 0, #f1f5f9 40%, #e5e7eb 100%);
        }

        .ps-mobile-menu-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 18px 20px 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .ps-mobile-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ps-mobile-close {
          border: none;
          background: transparent;
          font-size: 28px;
          line-height: 1;
          color: #020617;
          cursor: pointer;
        }

        .ps-mobile-links {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .ps-mobile-link {
          font-size: 22px;
          font-weight: 600;
          color: #020617;
          text-decoration: none;
        }

        .ps-mobile-link:hover {
          color: #0f766e;
        }

        .ps-mobile-footer {
          margin-top: auto;
        }

        .ps-mobile-auth {
          width: 100%;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #ffffff;
          padding: 12px 18px;
          font-size: 15px;
          font-weight: 600;
          color: #020617;
          cursor: pointer;
        }

        .ps-mobile-auth:hover {
          background: #e5e7eb;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .ps-navbar-inner {
            padding: 12px 16px;
          }

          .ps-navbar-links,
          .ps-navbar-actions {
            display: none;
          }

          .ps-navbar-toggle {
            display: inline-flex;
          }
        }
      `}</style>
    </>
  );
}
