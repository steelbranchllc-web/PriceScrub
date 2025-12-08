export default function CompanyPage() {
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
      <main
        style={{
          padding: "60px 16px 80px",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
          }}
        >
          {/* HERO / ABOUT */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)",
              gap: 32,
              alignItems: "flex-start",
              marginBottom: 64,
            }}
          >
            {/* Left: Story */}
            <div>
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
                Company
              </p>
              <h1
                style={{
                  marginTop: 10,
                  marginBottom: 12,
                  fontSize: 36,
                  lineHeight: 1.15,
                  color: "#0f172a",
                  fontWeight: 700,
                }}
              >
                Infrastructure for people who flip at scale.
              </h1>
              <p
                style={{
                  marginTop: 0,
                  fontSize: 15,
                  color: "#4b5563",
                  maxWidth: 640,
                  marginBottom: 8,
                }}
              >
                PriceScrub exists for operators who see signal where everyone
                else sees noise. We help them scan thousands of listings,
                surface real spreads, and make faster, more confident buy
                decisions.
              </p>
              <p
                style={{
                  marginTop: 0,
                  fontSize: 15,
                  color: "#4b5563",
                  maxWidth: 640,
                }}
              >
                No hype, no generic dashboards — just tooling that tells you
                what something is actually worth and whether it&apos;s worth
                your time.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 18,
                }}
              >
                <span
                  style={{
                    borderRadius: 999,
                    padding: "6px 12px",
                    backgroundColor: "#0f172a",
                    color: "#f9fafb",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Flipper-grade AI
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "6px 12px",
                    backgroundColor: "#e5e7eb",
                    color: "#111827",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  Built for real volume, not demos
                </span>
              </div>
            </div>

            {/* Right: belief card + pillars */}
            <div
              style={{
                borderRadius: 24,
                border: "1px solid #e5e7eb",
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: 20,
                fontSize: 14,
                color: "#4b5563",
                boxShadow: "0 18px 40px rgba(148,163,184,0.35)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#6b7280",
                  fontWeight: 600,
                  marginTop: 0,
                  marginBottom: 10,
                }}
              >
                What we believe
              </p>
              <p style={{ marginTop: 0, marginBottom: 12 }}>
                Marketplaces are getting bigger, faster, and messier. The edge
                isn&apos;t having more tabs open — it&apos;s having sharper data
                and tighter feedback loops.
              </p>
              <p style={{ marginTop: 0, marginBottom: 16 }}>
                We build for independent flippers first, not institutions:
                real-world constraints, real capital at risk, and tools that pay
                for themselves in a handful of good deals.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 10,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                {[
                  {
                    title: "Operators first",
                    body: "Designed around how real flippers actually work.",
                  },
                  {
                    title: "Data-driven",
                    body: "Pricing, demand, and risk grounded in real activity.",
                  },
                  {
                    title: "Explainable",
                    body: "Scores you can understand — not a black box.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      borderRadius: 18,
                      backgroundColor: "#f9fafb",
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        color: "#111827",
                        fontSize: 13,
                      }}
                    >
                      {item.title}
                    </p>
                    <p style={{ margin: "4px 0 0 0" }}>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* MISSION + SCOPE */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)",
              gap: 24,
              marginBottom: 64,
              alignItems: "flex-start",
            }}
          >
            {/* Mission card */}
            <div
              style={{
                borderRadius: 24,
                border: "1px solid #e5e7eb",
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: 20,
                boxShadow: "0 12px 32px rgba(148,163,184,0.3)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#6b7280",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 10,
                }}
              >
                Mission
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                Turn flipping from a hustle into a system.
              </p>
              <p
                style={{
                  marginTop: 0,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                We focus on the unglamorous parts that actually move the needle:
                sourcing, pricing, demand, and risk. If a feature doesn&apos;t
                help you find, underwrite, or exit a deal, we don&apos;t ship
                it.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    backgroundColor: "#f9fafb",
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.4,
                      color: "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    What we own
                  </p>
                  <p style={{ margin: "6px 0 0 0" }}>
                    Market scanning, pricing logic, demand signals, and clear
                    profit math.
                  </p>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    backgroundColor: "#f9fafb",
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.4,
                      color: "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    What you own
                  </p>
                  <p style={{ margin: "6px 0 0 0" }}>
                    Taste, capital, and conviction. PriceScrub just keeps the
                    edge sharp.
                  </p>
                </div>
              </div>
            </div>

            {/* Scope / where we operate */}
            <div style={{ fontSize: 14, color: "#4b5563", maxWidth: 620 }}>
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Where PriceScrub operates:
              </p>
              <ul
                style={{
                  marginTop: 0,
                  paddingLeft: 18,
                  marginBottom: 14,
                }}
              >
                <li>Real-world flipping and resale operations</li>
                <li>Marketplace data, scraping, and historical pricing</li>
                <li>Practical, explainable AI for buy/sell decisions</li>
              </ul>
              <p style={{ marginTop: 0, marginBottom: 10 }}>
                We&apos;re not a generic AI layer. PriceScrub is intentionally
                narrow: deep focus on pricing accuracy, demand signals, and risk
                across shoes, watches, collectibles, and beyond.
              </p>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 10,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    backgroundColor: "#eef2ff",
                    padding: "10px 12px",
                    border: "1px solid #e0e7ff",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#3730a3",
                    }}
                  >
                    24/7
                  </p>
                  <p style={{ margin: "4px 0 0 0" }}>
                    Built around always-on marketplace activity.
                  </p>
                </div>
                <div
                  style={{
                    borderRadius: 16,
                    backgroundColor: "#ecfdf3",
                    padding: "10px 12px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#15803d",
                    }}
                  >
                    Profit-first
                  </p>
                  <p style={{ margin: "4px 0 0 0" }}>
                    Every feature traces back to cleaner spreads and exits.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CONTACT */}
          <section
            style={{
              borderRadius: 24,
              border: "1px solid #e5e7eb",
              backgroundColor: "rgba(255,255,255,0.96)",
              padding: 24,
              fontSize: 14,
              color: "#4b5563",
              boxShadow: "0 12px 34px rgba(148,163,184,0.35)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#6b7280",
                fontWeight: 600,
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              Contact
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              Running serious volume or building tooling in this space?
            </h2>
            <p style={{ marginTop: 0, marginBottom: 14 }}>
              If you&apos;re operating at scale, building marketplace
              infrastructure, or exploring deeper integrations, we&apos;d love
              to talk.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  backgroundColor: "#e5e7eb",
                  color: "#111827",
                }}
              >
                Aggregators &amp; resellers
              </span>
              <span
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  backgroundColor: "#e5e7eb",
                  color: "#111827",
                }}
              >
                Marketplaces &amp; infra
              </span>
              <span
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  backgroundColor: "#e5e7eb",
                  color: "#111827",
                }}
              >
                Data &amp; tooling partners
              </span>
            </div>

            <div style={{ fontSize: 14, color: "#111827" }}>
              <p style={{ margin: "0 0 6px 0" }}>
                <span style={{ fontWeight: 600 }}>Email:</span>{" "}
                contact@pricescrub.com
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
