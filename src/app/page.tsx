"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

/* ---------- Types (mirror your route) ---------- */

type PriceStats = {
  median: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
};

type BaseAnalyzedOffer = {
  id: string;
  title: string;
  price: number | null;
  currency: string | null;
  url: string;
  source: string;
  imageUrl?: string | null;
  location?: string | null;

  estimatedFees?: number | null;
  estimatedShipping?: number | null;
  estimatedProfit?: number | null;
  profitMarginPct?: number | null;

  discountPctVsMedian?: number | null;

  productMarketStats?: PriceStats | null;
  discountPctVsProductMedian?: number | null;

  demandLabel?: string | null;
  estimatedSellTime?: string | null;

  aiEstimatedValue?: number | null;
};

type EnrichedOffer = BaseAnalyzedOffer & {
  profitVsAvg?: number | null;
  roiVsAvg?: number | null;
};

type SearchResponse = {
  listings: BaseAnalyzedOffer[];
  issues?: string[];
  priceStats?: {
    overall: PriceStats;
    bySource: Record<string, PriceStats>;
  };
};

type OverallStats = {
  overall: PriceStats;
  bySource: Record<string, PriceStats>;
};

/* ---------- Constants ---------- */

const SITE_OPTIONS = [
  { value: "any", label: "All sites" },
  { value: "facebook", label: "Facebook Marketplace" },
  { value: "ebay", label: "eBay" },
  { value: "offerup", label: "OfferUp" },
  { value: "stockx", label: "StockX" },
];

function sourceLabel(source: string) {
  if (source === "facebook" || source === "Facebook Marketplace")
    return "Facebook Marketplace";
  if (source === "all-retail") return "Retail";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

/* ============================================================
   Main page
   ============================================================ */

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [site, setSite] = useState("any");

  const [offers, setOffers] = useState<EnrichedOffer[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [summary, setSummary] = useState<{ query: string; site: string } | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (searchQuery: string, searchSite: string) => {
    const cleanedQuery = searchQuery.trim();
    if (!cleanedQuery) {
      setError("Enter something to search.");
      return;
    }

    setLoading(true);
    setError(null);
    setOffers([]);
    setStats(null);
    setSummary(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanedQuery, site: searchSite }),
      });

      const data: SearchResponse = await res.json();
      if (!res.ok)
        throw new Error((data as any).error || "Failed to fetch offers");

      let enriched: EnrichedOffer[] = (data.listings || []).map((offer) => {
        // ✅ FIX: route returns trueMarketPrice, so use it as a fallback.
        const o: any = offer as any;

        const estValue =
          typeof offer.aiEstimatedValue === "number"
            ? offer.aiEstimatedValue
            : typeof o.trueMarketPrice === "number"
            ? o.trueMarketPrice
            : offer.productMarketStats?.average != null
            ? offer.productMarketStats.average
            : null;

        let profitVsAvg: number | null = null;
        let roiVsAvg: number | null = null;

        if (offer.price != null && estValue != null && offer.price !== 0) {
          profitVsAvg = estValue - offer.price;
          roiVsAvg = (profitVsAvg / offer.price) * 100;
        }

        return {
          ...offer,
          // ✅ FIX: route may use sellTimeLabel; map it into what UI uses.
          estimatedSellTime:
            offer.estimatedSellTime ?? (typeof o.sellTimeLabel === "string" ? o.sellTimeLabel : null),
          // demandLabel already matches, but keep as-is.
          demandLabel:
            offer.demandLabel ?? (typeof o.demandLabel === "string" ? o.demandLabel : null),

          profitVsAvg,
          roiVsAvg,
          aiEstimatedValue: estValue,
        };
      });

      enriched = enriched.filter((offer) => {
        const roi = offer.roiVsAvg;
        if (roi == null || Number.isNaN(roi as number) || roi <= 0) {
          return false;
        }
        if (
          offer.profitVsAvg != null &&
          Number.isNaN(offer.profitVsAvg as number)
        ) {
          return false;
        }
        return true;
      });

      const sortedByROI = [...enriched].sort((a, b) => {
        const hasRoiA =
          typeof a.roiVsAvg === "number" && !Number.isNaN(a.roiVsAvg);
        const hasRoiB =
          typeof b.roiVsAvg === "number" && !Number.isNaN(b.roiVsAvg);

        if (hasRoiA && hasRoiB) {
          return (b.roiVsAvg as number) - (a.roiVsAvg as number);
        }
        if (hasRoiA && !hasRoiB) return -1;
        if (!hasRoiA && hasRoiB) return 1;

        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return a.price - b.price;
      });

      setOffers(sortedByROI);

      if (data.priceStats) setStats(data.priceStats as OverallStats);
      setSummary({ query: cleanedQuery, site: searchSite });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    }

    setLoading(false);
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    await performSearch(query, site);
  };

  const selectedSiteLabel =
    SITE_OPTIONS.find((s) => s.value === (summary?.site || site))?.label ||
    "All sites";

  return (
    <div
      className="page-root"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 42%, #f3f4f6 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <main
        className="page-main"
        style={{
          padding: "36px 8px 88px",
          flex: 1,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1120,
            margin: "0 auto",
          }}
        >
          {/* HERO SECTION */}
          <section
            className="hero-section"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1.1fr)",
              gap: 40,
              alignItems: "center",
              marginBottom: 80,
            }}
          >
            {/* Hero text */}
            <div>
              <h1
                className="hero-title"
                style={{
                  fontSize: 56,
                  lineHeight: 1.02,
                  marginBottom: 18,
                  color: "#0f172a",
                  fontWeight: 800,
                }}
              >
                Turn every search
                <br />
                into profit.
              </h1>
              <p
                style={{
                  fontSize: 20,
                  color: "#4b5563",
                  maxWidth: 520,
                  marginBottom: 28,
                  lineHeight: 1.5,
                }}
              >
                PriceScrub AI scans listings across top marketplaces, throws out
                fake comps, and highlights only high-confidence, underpriced
                opportunities.
              </p>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("analyzer");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  padding: "11px 24px",
                  borderRadius: 999,
                  border: "none",
                  background: "#16a34a",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 14px 34px rgba(22,163,74,0.4)",
                }}
              >
                Launch PriceScrub
              </button>
            </div>

            {/* Hero image card */}
            <div
              className="hero-image-card"
              style={{
                borderRadius: 36,
                overflow: "hidden",
                boxShadow: "0 26px 60px rgba(15,23,42,0.25)",
                border: "1px solid rgba(226,232,240,0.9)",
                backgroundColor: "#ffffff",
                height: 420,
              }}
            >
              <img
                src="/Hero.png"
                alt="Flipper working on laptop"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          </section>

          {/* FEATURE STRIP – 3-step flow */}
          <div
            className="feature-strip"
            style={{
              background:
                "linear-gradient(140deg, #e5e7eb, #e2e8f0 45%, #e5e7eb 100%)",
              padding: "30px 32px 38px",
              borderRadius: 40,
              border: "1px solid #d1d5db",
              marginTop: 72,
              marginBottom: 88,
              boxShadow: "0 18px 45px rgba(15,23,42,0.14)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 35,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 6,
                }}
              >
                Three Simple Steps from Search to Sold
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#4b5563",
                  maxWidth: 580,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                A framework that helps you identify and evaluate opportunities
                that make you money.
              </p>
            </div>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 28,
              }}
            >
              <FeatureCard
                stepLabel="Step 1"
                title="Search"
                description="Tell PriceScrub what you’re hunting for, from Jordan 1s to RTX cards, and choose where you want to source."
                imageSrc="/search.png"
              />
              <FeatureCard
                stepLabel="Step 2"
                title="Find"
                description="We scrub through real sold prices, kick out wild outliers, and calculate realistic resale value and ROI."
                imageSrc="/find.png"
              />
              <FeatureCard
                stepLabel="Step 3"
                title="Flip"
                description="See demand, estimated sell time, and your margin so you only buy what moves in days, not months."
                imageSrc="/flip.png"
              />
            </section>
          </div>

          {/* ANALYZER PANEL */}
          <section
            id="analyzer"
            style={{
              marginTop: 72,
              marginBottom: 96,
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              <h2
                className="analyzer-title"
                style={{
                  fontSize: 35,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 6,
                }}
              >
                Market Analysis Engine
              </h2>
              <div
                style={{
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                Drop in a search and let the AI do the heavy lifting on pricing,
                demand, and ROI.
              </div>
            </div>

            <div
              className="analyzer-card"
              style={{
                padding: 34,
                borderRadius: 32,
                backgroundColor: "#ffffff",
                border: "1px solid rgba(226,232,240,0.9)",
                boxShadow: "0 26px 70px rgba(148,163,184,0.45)",
              }}
            >
              {/* Analyzer header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 22,
                  alignItems: "center",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 26,
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    Instantly analyze thousands of listings
                  </h2>
                  <p
                    style={{
                      margin: 4,
                      marginTop: 6,
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    Try your first five searches on us for free. Upgrade to a
                    paid plan to unlock more searches.
                  </p>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: 0.14,
                    fontWeight: 600,
                  }}
                >
                  Powered by PriceScrub&nbsp;AI
                </div>
              </div>

              {/* SEARCH STRIP */}
              <form
                onSubmit={handleSubmit}
                style={{
                  padding: 24,
                  borderRadius: 22,
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  marginBottom: 24,
                }}
              >
                <label
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    fontWeight: 600,
                  }}
                >
                  What are you hunting for?
                </label>

                <div
                  style={{
                    position: "relative",
                    marginTop: 8,
                    marginBottom: 16,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Jordan 1 Lost & Found, Scotty Cameron putter, RTX 4090..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 999,
                      padding: "14px 18px 14px 42px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #d1d5db",
                      color: "#111827",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 18,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 14,
                      height: 14,
                      borderRadius: "999px",
                      border: "2px solid #9ca3af",
                      boxSizing: "border-box",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 28,
                      top: "54%",
                      width: 7,
                      height: 2,
                      borderRadius: 999,
                      backgroundColor: "#9ca3af",
                      transform: "rotate(40deg)",
                    }}
                  />
                </div>

                {/* SITES */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: 0.08,
                      fontWeight: 600,
                    }}
                  >
                    Sites
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {SITE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSite(opt.value)}
                        style={{
                          padding: "6px 13px",
                          borderRadius: 999,
                          cursor: "pointer",
                          border:
                            site === opt.value
                              ? "1px solid #16a34a"
                              : "1px solid #d4d4d8",
                          backgroundColor:
                            site === opt.value ? "#16a34a" : "#ffffff",
                          color: site === opt.value ? "#f9fafb" : "#111827",
                          fontSize: 13,
                          fontWeight: 500,
                          boxShadow:
                            site === opt.value
                              ? "0 6px 16px rgba(22,163,74,0.35)"
                              : "none",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: 16,
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "default" : "pointer",
                    opacity: loading ? 0.9 : 1,
                    boxShadow: "0 18px 40px rgba(22,163,74,0.45)",
                  }}
                >
                  {loading ? "Scrubbing the markets..." : "Search Listings"}
                </button>
              </form>

              {/* ERROR */}
              {error && (
                <div
                  style={{
                    padding: 10,
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius: 10,
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {/* SUMMARY CARDS */}
              {summary && stats && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 8,
                      fontSize: 13,
                      color: "#4b5563",
                    }}
                  >
                    Results for{" "}
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {summary.query}
                    </span>{" "}
                    on{" "}
                    <b style={{ color: "#16a34a" }}>{selectedSiteLabel}</b>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(160px,1fr))",
                      gap: 10,
                    }}
                  >
                    <SummaryCard
                      label="Avg est. value"
                      value={stats.overall.average}
                    />
                    <SummaryCard
                      label="Median price"
                      value={stats.overall.median}
                    />
                    <SummaryCard label="Cheapest" value={stats.overall.min} />
                    <SummaryCard label="Priciest" value={stats.overall.max} />
                  </div>
                </div>
              )}

              {/* ALL LISTINGS  */}
              {offers.length > 0 && (
                <section style={{ paddingBottom: 4 }}>
                  <h3
                    style={{
                      color: "#111827",
                      marginBottom: 8,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    All listings (sorted by ROI)
                  </h3>

                  <div style={{ display: "grid", gap: 8 }}>
                    {offers.map((offer) => (
                      <OfferCard key={offer.id} offer={offer} />
                    ))}
                  </div>
                </section>
              )}

              {summary && !loading && offers.length === 0 && !error && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  No profitable flips passed the AI filters for this search.
                  Try a different query or site.
                </div>
              )}
            </div>
          </section>

          {/* HOW PRICESCRUB MAKES YOU MONEY */}
          <section
            id="profit-engine"
            className="money-section"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1.1fr)",
              gap: 40,
              alignItems: "center",
              marginTop: 96,
              marginBottom: 96,
            }}
          >
            {/* Left: overlapping cards */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 340,
                marginTop: 40,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "48%",
                  borderRadius: 28,
                  backgroundColor: "#ffffff",
                  boxShadow: "0 22px 50px rgba(15,23,42,0.35)",
                  padding: 10,
                  transform: "rotate(-4deg)",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src="/before.png"
                    alt="Listing before the flip"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "48%",
                  borderRadius: 28,
                  backgroundColor: "#ffffff",
                  boxShadow: "0 22px 50px rgba(15,23,42,0.35)",
                  padding: 10,
                  transform: "rotate(3deg)",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src="/after.png"
                    alt="Listing after the flip"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right: copy */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <h2
                className="money-title"
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 12,
                }}
              >
                Built to turn flips into serious profit
              </h2>

              <p
                style={{
                  fontSize: 16,
                  color: "#4b5563",
                  maxWidth: 560,
                  lineHeight: 1.7,
                  marginBottom: 26,
                }}
              >
                PriceScrub doesn&apos;t just show you comps. It lays out the
                entire flip for you — from buy price to realistic resale value —
                so you see your spread, fees, and take-home profit before you
                ever hit buy.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  gap: 20,
                  flex: 1,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "999px",
                      backgroundColor: "#16a34a",
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 14,
                      color: "#4b5563",
                      lineHeight: 1.7,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      See your upside in one view.
                    </span>{" "}
                    Buy price, true resale value, platform fees, and profit are
                    all lined up so a $200 buy with $180 plus upside jumps out
                    at you in seconds.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "999px",
                      backgroundColor: "#16a34a",
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 14,
                      color: "#4b5563",
                      lineHeight: 1.7,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      Stack reliable $100–$300 profit flips.
                    </span>{" "}
                    AI throws out fake and wild comps and surfaces realistic,
                    repeatable deals, so a handful of clean flips each week can
                    add hundreds to a few thousand dollars a month.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "999px",
                      backgroundColor: "#16a34a",
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 14,
                      color: "#4b5563",
                      lineHeight: 1.7,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      Move inventory in days, not months.
                    </span>{" "}
                    Demand labels and estimated sell windows point you toward
                    fast-moving items so cash comes back quickly instead of
                    sitting in dead stock.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Responsive styles */}
      <style jsx>{`
        /* Tablet / small desktop */
        @media (max-width: 900px) {
          .page-main {
            padding: 28px 14px 72px !important;
          }

          .hero-section {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 28px !important;
            margin-bottom: 56px !important;
          }

          .hero-image-card {
            max-width: 480px;
            margin: 0 auto;
            height: 320px !important;
          }

          .feature-strip {
            padding: 24px 18px 30px !important;
            border-radius: 28px !important;
            margin-top: 40px !important;
            margin-bottom: 60px !important;
          }

          .analyzer-card {
            padding: 24px !important;
            border-radius: 24px !important;
          }

          .money-section {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 32px !important;
            margin-top: 72px !important;
            margin-bottom: 72px !important;
          }
        }

        /* Phone */
        @media (max-width: 640px) {
          .page-main {
            padding: 24px 14px 64px !important;
          }

          .hero-title {
            font-size: 32px !important;
            line-height: 1.15 !important;
          }

          .hero-section {
            margin-bottom: 44px !important;
          }

          .feature-strip h2 {
            font-size: 24px !important;
          }

          .analyzer-title {
            font-size: 24px !important;
          }

          .money-title {
            font-size: 24px !important;
          }

          .hero-image-card,
          .feature-strip,
          .analyzer-card {
            box-shadow: 0 10px 26px rgba(148, 163, 184, 0.3) !important;
          }

          .analyzer-card {
            padding: 20px !important;
          }

          .money-section > div:first-child {
            height: 260px !important;
            margin-top: 16px !important;
          }

          .offer-card {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .offer-card-right {
            text-align: left !important;
            min-width: 0 !important;
            width: 100% !important;
            margin-top: 6px !important;
          }
        }

        /* Extra small phones */
        @media (max-width: 480px) {
          .page-main {
            padding: 20px 10px 56px !important;
          }

          .feature-strip {
            padding: 20px 14px 26px !important;
          }

          .money-section {
            margin-top: 56px !important;
            margin-bottom: 56px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- Small components ---------- */

function FeatureCard({
  stepLabel,
  title,
  description,
  imageSrc,
}: {
  stepLabel?: string;
  title: string;
  description: string;
  imageSrc: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Step badge to the left, word centered */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {stepLabel && (
            <div
              style={{
                position: "absolute",
                right: "100%",
                marginRight: 10,
                fontSize: 11,
                letterSpacing: 0.14,
                textTransform: "uppercase",
                padding: "4px 11px",
                borderRadius: 999,
                backgroundColor: "#e5f7ec",
                border: "1px solid #bbf7d0",
                color: "#15803d",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {stepLabel}
            </div>
          )}

          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#111827",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 32,
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: "0 22px 55px rgba(148, 163, 184, 0.35)",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 220,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: "#f3f4f6",
          }}
        >
          <img
            src={imageSrc}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        <p
          style={{
            fontSize: 14,
            color: "#4b5563",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: any }) {
  const formatted =
    typeof value === "number" && !Number.isNaN(value)
      ? `$${value.toFixed(2)}`
      : "—";

  return (
    <div
      style={{
        padding: 10,
        borderRadius: 12,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 20px rgba(148, 163, 184, 0.25)",
      }}
    >
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
        {formatted}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  highlight = false,
}: {
  offer: EnrichedOffer;
  highlight?: boolean;
}) {
  const estValue = offer.aiEstimatedValue ?? null;
  const profitVsAvg = offer.profitVsAvg ?? null;
  const roiVsAvg = offer.roiVsAvg ?? null;
  const demand = offer.demandLabel ?? null;
  const sellTime = offer.estimatedSellTime ?? null;

  const profitDisplay =
    profitVsAvg != null
      ? `${profitVsAvg >= 0 ? "+$" : "-$"}${Math.abs(profitVsAvg).toFixed(2)}`
      : null;

  const roiColor =
    roiVsAvg != null && roiVsAvg > 0
      ? "#15803d"
      : roiVsAvg != null
      ? "#b91c1c"
      : "#374151";

  return (
    <a
      className="offer-card"
      href={offer.url || "#"}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 12,
        borderRadius: 18,
        backgroundColor: highlight ? "#ecfdf3" : "#ffffff",
        border: highlight ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
        color: "#111827",
        textDecoration: "none",
        boxShadow: highlight
          ? "0 14px 32px rgba(74, 222, 128, 0.45)"
          : "0 8px 20px rgba(148, 163, 184, 0.3)",
      }}
    >
      {/* LEFT */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "#f3f4f6",
            flexShrink: 0,
            border: "1px solid #e5e7eb",
          }}
        >
          {offer.imageUrl && (
            <img
              src={offer.imageUrl}
              alt={offer.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 3,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              maxWidth: "520px",
            }}
          >
            {offer.title}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span
              style={{
                padding: "3px 10px",
                fontSize: 11,
                borderRadius: 999,
                backgroundColor: "#f3f4f6",
                border: "1px solid #e5e7eb",
                color: "#374151",
              }}
            >
              {sourceLabel(offer.source)}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div
        className="offer-card-right"
        style={{
          textAlign: "right",
          minWidth: 190,
          fontSize: 13,
          color: "#4b5563",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#16a34a",
            marginBottom: 2,
          }}
        >
          {offer.price != null ? `$${offer.price.toFixed(2)}` : "—"}
        </div>

        {estValue != null && (
          <div style={{ fontSize: 13, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, color: "#111827" }}>
              ${estValue.toFixed(2)}
            </span>{" "}
            est. value
          </div>
        )}

        {profitDisplay && roiVsAvg != null && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: roiColor,
            }}
          >
            {profitDisplay} ({roiVsAvg.toFixed(0)}% ROI)
          </div>
        )}

        {sellTime && (
          <div
            style={{
              fontSize: 12,
              marginTop: 3,
              color: "#4f46e5",
            }}
          >
            Est. sell time: {sellTime}
            {demand ? ` • Demand: ${demand}` : ""}
          </div>
        )}
      </div>
    </a>
  );
}
