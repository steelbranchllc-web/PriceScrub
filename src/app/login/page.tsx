"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: connect to your real auth backend here
    console.log("Log in with:", { email, password });

    setLoading(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        padding: "32px 16px 72px",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <Link href="/">
            <img
              src="/Logo.png"
              alt="PriceScrub logo"
              style={{ height: 70, cursor: "pointer" }}
            />
          </Link>

          <Link href="/signup">
            <button
              type="button"
              style={{
                padding: "12px 32px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: "#f9fafb",
                color: "#111827",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(15,23,42,0.08)",
              }}
            >
              Sign Up
            </button>
          </Link>
        </header>

        {/* Big login card */}
        <section
          style={{
            borderRadius: 40,
            padding: "40px 48px 36px",
            backgroundColor: "#ffffff",
            boxShadow: "0 40px 120px rgba(15,23,42,0.25)",
            border: "1px solid #e5e7eb",
            maxWidth: 860,
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: 36,
              marginBottom: 10,
              color: "#111827",
            }}
          >
            Log in to PriceScrub
          </h1>

          <p
            style={{
              fontSize: 15,
              color: "#6b7280",
              marginBottom: 28,
            }}
          >
            Pick up where you left off and keep tracking your best flips.
          </p>

          {/* Email/password form */}
          <form
            onSubmit={handleSubmit}
            style={{
              maxWidth: 680,
              marginTop: 10,
            }}
          >
            {/* Email */}
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "12px 14px",
                border: "1px solid #d1d5db",
                marginBottom: 16,
                fontSize: 15,
              }}
            />

            {/* Password */}
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "12px 14px",
                border: "1px solid #d1d5db",
                marginBottom: 10,
                fontSize: 15,
              }}
            />

            {/* Forgot password (placeholder link) */}
            <div
              style={{
                textAlign: "right",
                marginBottom: 22,
                fontSize: 13,
              }}
            >
              <button
                type="button"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#16a34a",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 500,
                }}
                onClick={() => {
                  // TODO: route to real reset page
                  alert("Password reset flow coming soon.");
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Log In button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(120deg,#16a34a,#22c55e,#65a30d 90%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? "default" : "pointer",
                boxShadow: "0 22px 60px rgba(22,163,74,0.45)",
                opacity: loading ? 0.9 : 1,
                marginBottom: 14,
              }}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>

            {/* Footer link */}
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                textAlign: "center",
                marginTop: 4,
              }}
            >
              New to PriceScrub?{" "}
              <Link href="/signup" style={{ color: "#16a34a", fontWeight: 600 }}>
                Create an account
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
