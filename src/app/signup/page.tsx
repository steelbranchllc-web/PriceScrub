"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Connect to your auth backend
    console.log("Sign up with:", { email, password });

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

          <Link href="/login">
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
              Log In
            </button>
          </Link>
        </header>

        {/* Big signup card */}
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
            Create your PriceScrub account
          </h1>

          <p
            style={{
              fontSize: 15,
              color: "#6b7280",
              marginBottom: 28,
            }}
          >
            Save searches, track deals, and sync your best flips across devices.
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
                marginBottom: 22,
                fontSize: 15,
              }}
            />

            {/* Sign Up Button */}
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
              {loading ? "Creating account..." : "Sign Up"}
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
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#16a34a", fontWeight: 600 }}>
                Log in
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
