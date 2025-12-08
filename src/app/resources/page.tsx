export default function ResourcesPage() {
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
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: "#6b7280",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Resources
          </p>
          <h1
            style={{
              marginTop: 10,
              marginBottom: 12,
              fontSize: 32,
              lineHeight: 1.15,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Get smarter about flipping and pricing.
          </h1>
          <p
            style={{
              marginTop: 0,
              marginBottom: 28,
              fontSize: 15,
              color: "#4b5563",
              maxWidth: 640,
            }}
          >
            Guides, FAQs, and product updates to help you squeeze more value out
            of every search.
          </p>

          {/* Guides */}
          <section style={{ marginBottom: 40 }}>
            <h2
              style={{
                margin: 0,
                marginBottom: 12,
                fontSize: 18,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Guides
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  title: "Building a sourcing routine that compounds",
                  body: "Turn scrolling time into a simple daily playbook that surfaces only real deals.",
                },
                {
                  title: "How we calculate true resale value",
                  body: "A plain-English walkthrough of the data and logic behind our price estimates.",
                },
                {
                  title: "Managing risk across categories",
                  body: "Why shoes, watches, and collectibles behave differently—and how we account for it.",
                },
              ].map((g) => (
                <article
                  key={g.title}
                  style={{
                    borderRadius: 18,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "rgba(255,255,255,0.96)",
                    padding: 16,
                    boxShadow: "0 10px 26px rgba(148,163,184,0.28)",
                    fontSize: 14,
                    color: "#4b5563",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      marginBottom: 6,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {g.title}
                  </h3>
                  <p style={{ margin: 0 }}>{g.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section style={{ marginBottom: 40 }}>
            <h2
              style={{
                margin: 0,
                marginBottom: 12,
                fontSize: 18,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              FAQ
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 16,
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              <div
                style={{
                  borderRadius: 16,
                  backgroundColor: "#f9fafb",
                  padding: 14,
                  border: "1px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: 4,
                  }}
                >
                  What marketplaces do you support?
                </p>
                <p style={{ margin: 0 }}>
                  We focus on major resale and marketplace platforms first, then
                  expand into niche verticals where we can add real signal.
                </p>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  backgroundColor: "#f9fafb",
                  padding: 14,
                  border: "1px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: 4,
                  }}
                >
                  How often is pricing data refreshed?
                </p>
                <p style={{ margin: 0 }}>
                  We regularly refresh sold data and current listings so demand
                  shifts and new floors show up quickly.
                </p>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  backgroundColor: "#f9fafb",
                  padding: 14,
                  border: "1px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: 4,
                  }}
                >
                  Can I export or share results?
                </p>
                <p style={{ margin: 0 }}>
                  Pro and Teams plans support exports and shared lists so you
                  can plug PriceScrub into the rest of your workflow.
                </p>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 18,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Product updates
            </h2>
            <p
              style={{
                marginTop: 0,
                marginBottom: 10,
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              A quick look at what we&apos;ve shipped recently.
            </p>

            <ul
              style={{
                marginTop: 0,
                paddingLeft: 18,
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              <li>Demand labels and estimated sell-time windows</li>
              <li>Better outlier filtering for luxury categories</li>
              <li>Improved image coverage on marketplace listings</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
