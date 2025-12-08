"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        padding: "40px 32px 20px",
        backgroundColor: "#e5e7eb",
        width: "100%",
        borderTop: "1px solid #d1d5db",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top grid area */}
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) repeat(3, minmax(0, 1fr))",
          gap: 40,
          alignItems: "flex-start",
          paddingBottom: 40,
        }}
      >
        {/* Brand Section */}
        <div>
          <h3
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 10,
            }}
          >
            PriceScrub AI
          </h3>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "#0f172a",
              maxWidth: 360,
            }}
          >
            Flipper-grade AI for finding real spreads in messy marketplaces.
          </p>
        </div>

        {/* Product */}
        <FooterColumn
          title="Product"
          links={[
            { href: "/#analyzer", label: "Market analysis engine" },
            { href: "/pricing", label: "Pricing" },
            { href: "/resources", label: "Resources" },
          ]}
        />

        {/* Company */}
        <FooterColumn
          title="Company"
          links={[
            { href: "/company", label: "Meet PriceScrub" },
            { href: "/solutions", label: "Solutions" },
          ]}
        />

        {/* Account */}
        <FooterColumn
          title="Account"
          links={[
            { href: "/terms", label: "Terms of service" },
            { href: "/privacy", label: "Privacy policy" },
            { href: "/login", label: "Log in" },
            { href: "/signup", label: "Sign up" },
          ]}
        />
      </div>

      {/* COPYRIGHT — bottom */}
      <div
        style={{
          textAlign: "center",
          marginTop: "auto",
          fontSize: 13,
          color: "#374151",
          fontWeight: 500,
          paddingBottom: 10,
        }}
      >
        © 2025 PriceScrub. All rights reserved.
      </div>
    </footer>
  );
}

/* Footer Column Component */
function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4
        style={{
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 12,
          color: "#0f172a",
        }}
      >
        {title}
      </h4>

      {links.map((link, index) => (
        <div key={`${link.href}-${index}`} style={{ marginBottom: 8 }}>
          <Link
            href={link.href}
            style={{
              color: "#6b7280", // lighter black / premium gray
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {link.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
