export default function SolutionsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 42%, #f3f4f6 100%)",
      }}
    >
      <main style={{ padding: "60px 16px 80px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          {/* Page header */}
          <div style={{ maxWidth: 720 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                color: "#6b7280",
                fontWeight: 600,
                margin: 0,
                marginBottom: 6,
              }}
            >
              Solutions
            </p>

            <h1
              style={{
                marginTop: 4,
                marginBottom: 10,
                fontSize: 34,
                lineHeight: 1.15,
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              Different profiles, same edge.
            </h1>

            <p
              style={{
                marginTop: 0,
                marginBottom: 24,
                fontSize: 15,
                color: "#4b5563",
                maxWidth: 640,
              }}
            >
              Whether you&apos;re stacking weekend flips or running a full-time
              operation, PriceScrub keeps your deal flow sharp with the same
              AI-powered sourcing engine.
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                backgroundColor: "#eef2ff",
                border: "1px solid #e0e7ff",
                fontSize: 12,
                color: "#4338ca",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.12,
                marginBottom: 24,
              }}
            >
              Who PriceScrub is for
            </div>
          </div>

          {/* Solutions grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 24,
            }}
          >
            {/* SIDE-HUSTLE CARD */}
            <section
              style={{
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.96)",
                border: "1px solid #e5e7eb",
                boxShadow: "0 14px 32px rgba(148,163,184,0.25)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.8,
                  color: "#6b7280",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                Side-hustle flippers
              </p>
              <h2
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                Find a few great flips each week.
              </h2>
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                Turn scattered scrolling into a focused sourcing session that
                surfaces only high-confidence deals.
              </p>
              <ul
                style={{
                  marginTop: 0,
                  paddingLeft: 18,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                <li>Simple search with ROI-first results</li>
                <li>Demand labels so you don&apos;t get stuck holding</li>
                <li>Pricing tuned for realistic, fast exits</li>
              </ul>
            </section>

            {/* FULL-TIME CARD */}
            <section
              style={{
                borderRadius: 24,
                backgroundColor: "#ecfdf3",
                border: "1px solid #bbf7d0",
                boxShadow: "0 16px 40px rgba(22,163,74,0.25)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.8,
                  color: "#16a34a",
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                Full-time resellers
              </p>
              <h2
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#052e16",
                }}
              >
                Systematize sourcing and risk.
              </h2>
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  fontSize: 14,
                  color: "#14532d",
                }}
              >
                Build repeatable playbooks niche by niche, city by city, with
                clear buy boxes and margin targets.
              </p>
              <ul
                style={{
                  marginTop: 0,
                  paddingLeft: 18,
                  fontSize: 14,
                  color: "#14532d",
                }}
              >
                <li>Higher analysis limits for daily sourcing</li>
                <li>Conservative spreads for real capital at risk</li>
                <li>Sell-time windows to smooth cash flow</li>
              </ul>
            </section>

            {/* TEAMS CARD */}
            <section
              style={{
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.96)",
                border: "1px solid #e5e7eb",
                boxShadow: "0 14px 32px rgba(148,163,184,0.25)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.8,
                  color: "#6b7280",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                Teams &amp; operations
              </p>
              <h2
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                Keep your buyers aligned on what &quot;good&quot; looks like.
              </h2>
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                Use consistent pricing logic and demand signals across multiple
                buyers, markets, and accounts.
              </p>
              <ul
                style={{
                  marginTop: 0,
                  paddingLeft: 18,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                <li>Shared definitions of acceptable spreads</li>
                <li>Cleaner reporting on sourcing performance</li>
                <li>Playbooks you can hand to new buyers on day one</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
