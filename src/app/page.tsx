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
  source: string; // "facebook", "ebay", "all-retail", etc.
  imageUrl?: string | null;
  location?: string | null;

  estimatedFees?: number | null;
  estimatedShipping?: number | null;
  estimatedProfit?: number | null;
  profitMarginPct?: number | null;

  discountPctVsMedian?: number | null;

  // item-specific stats keyed by product name
  productMarketStats?: PriceStats | null;
  discountPctVsProductMedian?: number | null;

  // AI demand info
  demandLabel?: string | null;
  estimatedSellTime?: string | null;
};

type EnrichedOffer = BaseAnalyzedOffer & {
  profitVsAvg?: number | null; // avg sell price - price
  roiVsAvg?: number | null; // (avg sell price - price) / price * 100
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

  // Centralized search function so we can call it from form
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
      if (!res.ok) throw new Error((data as any).error || "Failed to fetch offers");

      // Enrich with profit / ROI vs avg
      let enriched: EnrichedOffer[] = (data.listings || []).map((offer) => {
        const average = offer.productMarketStats?.average ?? null;
        let profitVsAvg: number | null = null;
        let roiVsAvg: number | null = null;

        if (offer.price != null && average != null && offer.price !== 0) {
          profitVsAvg = average - offer.price;
          roiVsAvg = (profitVsAvg / offer.price) * 100;
        }

        return { ...offer, profitVsAvg, roiVsAvg };
      });

      // 🔥 UI-level guard: drop 0% or negative ROI (or missing ROI/profit)
      enriched = enriched.filter((offer) => {
        if (offer.roiVsAvg == null || Number.isNaN(offer.roiVsAvg)) return false;
        if (offer.profitVsAvg == null || Number.isNaN(offer.profitVsAvg)) return false;
        return offer.roiVsAvg > 0 && offer.profitVsAvg > 0;
      });

      // Sort listings by ROI desc; if ROI missing, fall back to price asc
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

        // neither has ROI -> sort by price asc, keeping nulls at end
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
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        padding: "32px 16px 72px",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        {/* TOP NAV / LOGO */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/Logo.png"
              alt="PriceScrub logo"
              style={{ height: 115, objectFit: "contain" }}
            />
          </div>

          {/* Auth buttons (Log In / Sign Up) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Link href="/login">
              <button
                type="button"
                style={{
                  padding: "12px 27px",
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#4b5563",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
                }}
              >
                Log In
              </button>
            </Link>
            <Link href="/signup">
              <button
                type="button"
                style={{
                  padding: "12px 27px",
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  background: "#f3f4f6",
                  color: "#111827",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
                }}
              >
                Sign Up
              </button>
            </Link>
          </div>
        </header>

        {/* HERO SECTION */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1.1fr)",
            gap: 40,
            alignItems: "center",
            marginBottom: 64,
          }}
        >
          {/* Hero text */}
          <div>
            <h1
              style={{
                fontSize: 44,
                lineHeight: 1.1,
                marginBottom: 16,
                color: "#111827",
              }}
            >
              Turn Every Search
              <br />
              Into Profit.
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "#4b5563",
                maxWidth: 480,
                marginBottom: 24,
              }}
            >
              PriceScrub scans listings across top marketplaces, throws out fake
              comps, and uses AI to show only high-confidence, underpriced
              opportunities.
            </p>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("analyzer");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "12px 24px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(120deg,#16a34a,#22c55e,#65a30d 90%)",
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 16px 35px rgba(34,197,94,0.45)",
              }}
            >
              Launch PriceScrub AI
            </button>
          </div>

          {/* Hero image card – image fills the whole box */}
          <div
            style={{
              borderRadius: 40,
              overflow: "hidden",
              boxShadow: "0 28px 70px rgba(15,23,42,0.28)",
              border: "1px solid #e5e7eb",
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

        {/* FEATURE STRIP: Search / Find / Flip */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 32,
            marginBottom: 64,
          }}
        >
          <FeatureCard
            title="Search"
            description="Tell PriceScrub what you’re hunting for—from Jordan 1s to RTX cards—and where you want to source."
            imageSrc="/search.png"
          />
          <FeatureCard
            title="Find"
            description="We scrub through real sold prices, kick out wild outliers, and calculate realistic resale value and ROI."
            imageSrc="/find.png"
          />
          <FeatureCard
            title="Flip"
            description="See demand, estimated sell time, and your margin—so you only buy what moves in days, not months."
            imageSrc="/flip.png"
          />
        </section>

        {/* ANALYZER PANEL */}
        <section id="analyzer">
          <div
            style={{
              padding: 24,
              borderRadius: 28,
              backgroundColor: "#e5e7eb",
              border: "1px solid #d1d5db",
              boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
            }}
          >
            {/* Inner content card */}
            <div
              style={{
                borderRadius: 24,
                backgroundColor: "#ffffff",
                padding: 24,
                boxShadow: "0 10px 30px rgba(148,163,184,0.35)",
                border: "1px solid #e5e7eb",
              }}
            >
              {/* Analyzer header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 20,
                      margin: 0,
                      color: "#111827",
                    }}
                  >
                    Search thousands of listings in just one click
                  </h2>
                </div>
              </div>

              {/* SEARCH STRIP */}
              <form
                onSubmit={handleSubmit}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    fontWeight: 600,
                  }}
                >
                  What are you hunting for?
                </label>

                <input
                  type="text"
                  placeholder="Jordan 1 Lost & Found, Scotty Cameron putter, RTX 4090..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    marginBottom: 14,
                    borderRadius: 12,
                    padding: "12px 14px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    color: "#111827",
                    fontSize: 14,
                    outline: "none",
                  }}
                />

                {/* SITES */}
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
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
                          padding: "7px 14px",
                          borderRadius: 999,
                          cursor: "pointer",
                          border:
                            site === opt.value
                              ? "1px solid transparent"
                              : "1px solid #d1d5db",
                          backgroundColor:
                            site === opt.value ? "#16a34a" : "#ffffff",
                          color: site === opt.value ? "#f9fafb" : "#111827",
                          fontSize: 13,
                          fontWeight: 500,
                          boxShadow:
                            site === opt.value
                              ? "0 10px 24px rgba(22,163,74,0.45)"
                              : "none",
                          transition:
                            "background-color 0.12s ease, box-shadow 0.12s ease, transform 0.08s ease",
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
                    padding: "12px 18px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(120deg,#16a34a,#22c55e,#65a30d 90%)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "default" : "pointer",
                    opacity: loading ? 0.9 : 1,
                    boxShadow: "0 16px 40px rgba(22,163,74,0.5)",
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
                    marginBottom: 14,
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {/* SUMMARY CARDS (overall stats) */}
              {summary && stats && (
                <div
                  style={{
                    marginBottom: 18,
                    padding: 12,
                    borderRadius: 16,
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
                      gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                      gap: 10,
                    }}
                  >
                    <SummaryCard
                      label="Avg sell price"
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
                    All Listings (sorted by ROI)
                  </h3>

                  <div style={{ display: "grid", gap: 8 }}>
                    {offers.map((offer) => (
                      <OfferCard key={offer.id} offer={offer} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ---------- Small components ---------- */

function FeatureCard({
  title,
  description,
  imageSrc,
}: {
  title: string;
  description: string;
  imageSrc: string;
}) {
  return (
    <div
      style={{
        borderRadius: 40,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 22px 55px rgba(148,163,184,0.35)",
        height: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          height: 220,
          borderRadius: 28,
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
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: 14,
          color: "#4b5563",
          margin: 0,
        }}
      >
        {description}
      </p>
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
        boxShadow: "0 8px 20px rgba(148,163,184,0.25)",
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
  const marketAvg = offer.productMarketStats?.average ?? null;
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
          ? "0 14px 32px rgba(74,222,128,0.45)"
          : "0 8px 20px rgba(148,163,184,0.3)",
        transition:
          "transform 0.08s ease-out, box-shadow 0.08s ease-out, border-color 0.08s ease-out",
      }}
    >
      {/* LEFT: image + title + chips */}
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

      {/* RIGHT: price + avg sell price + profit/ROI + sell-time */}
      <div
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

        {marketAvg != null && (
          <div style={{ fontSize: 13, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, color: "#111827" }}>
              ${marketAvg.toFixed(2)}
            </span>{" "}
            avg sell price
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
