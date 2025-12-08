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

    // TODO: connect to your real sign-up backend here
    console.log("Sign up with:", { email, password });

    setLoading(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 16px 72px",
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 42%, #f3f4f6 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* Sign up card */}
        <section
          style={{
            borderRadius: 36,
            padding: "40px 40px 34px",
            backgroundColor: "#ffffff",
            boxShadow: "0 26px 70px rgba(148,163,184,0.45)",
            border: "1px solid rgba(226,232,240,0.9)",
            maxWidth: 820,
            margin: "32px auto 0",
          }}
        >
          <h1
            style={{
              fontSize: 34,
              marginBottom: 10,
              color: "#0f172a",
              fontWeight: 800,
            }}
          >
            Create your PriceScrub account
          </h1>

          <p
            style={{
              fontSize: 15,
              color: "#6b7280",
              marginBottom: 26,
              maxWidth: 520,
            }}
          >
            Take PriceScrub for a spin and start spotting high-confidence flips
            in minutes.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              maxWidth: 640,
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
                color: "#111827",
                outline: "none",
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
                color: "#111827",
                outline: "none",
              }}
            />

            {/* Sign up button */}
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
