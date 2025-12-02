"use client";

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

  // NEW – AI demand info
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

/* ---------- Helpers ---------- */

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
  const [undervalued, setUndervalued] = useState<EnrichedOffer[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [summary, setSummary] = useState<{ query: string; site: string } | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    const cleanedQuery = query.trim();
    if (!cleanedQuery) {
      setError("Enter something to search.");
      return;
    }

    setLoading(true);
    setError(null);
    setOffers([]);
    setUndervalued([]);
    setStats(null);
    setSummary(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanedQuery, site }),
      });

      const data: SearchResponse = await res.json();
      if (!res.ok) throw new Error((data as any).error || "Failed to fetch offers");

      // Enrich each listing with profit vs avg & ROI vs avg,
      // using the item-specific productMarketStats.average.
      const enriched: EnrichedOffer[] = (data.listings || []).map((offer) => {
        const average = offer.productMarketStats?.average ?? null;
        let profitVsAvg: number | null = null;
        let roiVsAvg: number | null = null;

        if (offer.price != null && average != null) {
          profitVsAvg = average - offer.price;
          roiVsAvg = (profitVsAvg / offer.price) * 100;
        }

        return { ...offer, profitVsAvg, roiVsAvg };
      });

      // Sort ALL listings by price for the "All listings" section.
      const sortedByPrice = [...enriched].sort((a, b) => {
        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return a.price - b.price;
      });

      setOffers(sortedByPrice);

      // High-value = positive ROI vs avg; sort highest ROI first.
      const highValue = enriched
        .filter((o) => o.roiVsAvg != null && (o.roiVsAvg as number) > 0)
        .sort((a, b) => (b.roiVsAvg ?? -Infinity) - (a.roiVsAvg ?? -Infinity));

      setUndervalued(highValue);

      if (data.priceStats) setStats(data.priceStats as OverallStats);
      setSummary({ query: cleanedQuery, site });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    }

    setLoading(false);
  };

  const selectedSiteLabel =
    SITE_OPTIONS.find((s) => s.value === (summary?.site || site))?.label ||
    "All sites";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "36px 12px",
        background: "radial-gradient(circle at top,#020617,#020617)",
        color: "#e5e7eb",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          borderRadius: 28,
          padding: 32,
          background: "rgba(15,23,42,0.98)",
          border: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        {/* HEADER */}
        <header style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/Logo.png"
            style={{
              height: 120,
              objectFit: "contain",
              marginBottom: 10,
            }}
          />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            Scan listings, benchmark against the market, and surface undervalued flips.
          </p>
        </header>

        {/* SEARCH FORM */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 20,
            borderRadius: 18,
            background: "#020617",
            border: "1px solid rgba(31,41,55,0.9)",
            marginBottom: 24,
          }}
        >
          {/* Input */}
          <label style={{ fontSize: 11, color: "#6b7280" }}>
            What are you hunting for?
          </label>

          <input
            type="text"
            placeholder="Kobe 6 Protro, RTX 4090, iPhone 15 Pro..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              marginBottom: 16,
              borderRadius: 12,
              padding: "12px 14px",
              background: "#020617",
              border: "1px solid rgba(55,65,81,0.9)",
              color: "white",
              fontSize: 15,
            }}
          />

          {/* SITES */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, color: "#6b7280" }}>Sites</label>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 10,
              }}
            >
              {SITE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSite(opt.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    cursor: "pointer",
                    border:
                      site === opt.value
                        ? "1px solid transparent"
                        : "1px solid rgba(55,65,81,0.7)",
                    background:
                      site === opt.value
                        ? "linear-gradient(120deg,#22c55e,#4ade80)"
                        : "rgba(15,23,42,0.95)",
                    color: site === opt.value ? "#020617" : "#e5e7eb",
                    boxShadow:
                      site === opt.value
                        ? "0 6px 20px rgba(16,185,129,0.4)"
                        : "none",
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 18px",
              borderRadius: 999,
              background: "linear-gradient(120deg,#22c55e,#4ade80)",
              color: "#020617",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Scrubbing..." : "Search High-Value Finds"}
          </button>
        </form>

        {/* ERROR */}
        {error && (
          <div
            style={{
              padding: 10,
              background: "rgba(248,113,113,0.15)",
              border: "1px solid rgba(248,113,113,0.4)",
              color: "#fecaca",
              borderRadius: 10,
              marginBottom: 16,
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
              padding: 14,
              borderRadius: 18,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(55,65,81,0.9)",
            }}
          >
            <div style={{ marginBottom: 8, fontSize: 13, color: "#9ca3af" }}>
              Results for <b>{summary.query}</b> on{" "}
              <b style={{ color: "#22c55e" }}>{selectedSiteLabel}</b>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                gap: 8,
              }}
            >
              <SummaryCard label="Avg sell price" value={stats.overall.average} />
              <SummaryCard label="Median price" value={stats.overall.median} />
              <SummaryCard label="Cheapest" value={stats.overall.min} />
              <SummaryCard label="Priciest" value={stats.overall.max} />
            </div>
          </div>
        )}

        {/* TOP DEALS – sorted by ROI */}
        {undervalued.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h2
              style={{
                color: "#bbf7d0",
                marginBottom: 10,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Top High-Value Finds
            </h2>

            <div style={{ display: "grid", gap: 10 }}>
              {undervalued.map((offer) => (
                <OfferCard key={offer.id} offer={offer} highlight />
              ))}
            </div>
          </section>
        )}

        {/* ALL LISTINGS – sorted by price */}
        {offers.length > 0 && (
          <section>
            <h2
              style={{
                color: "#e5e7eb",
                marginBottom: 10,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              All Listings (sorted by price)
            </h2>

            <div style={{ display: "grid", gap: 10 }}>
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/* ---------- Small components ---------- */

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
        background: "#020617",
        border: "1px solid rgba(55,65,81,0.8)",
      }}
    >
      <div style={{ fontSize: 11, color: "#9ca3af" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600 }}>{formatted}</div>
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
      ? "#4ade80"
      : roiVsAvg != null
      ? "#f97373"
      : "#e5e7eb";

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
        gap: 14,
        padding: 14,
        borderRadius: 18,
        background: highlight
          ? "linear-gradient(120deg,#022c22,#064e3b)"
          : "#020617",
        border: highlight
          ? "1px solid rgba(34,197,94,0.9)"
          : "1px solid rgba(31,41,55,0.95)",
        color: "#f9fafb",
        textDecoration: "none",
      }}
    >
      {/* LEFT: image + title + chips */}
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Product image */}
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 18,
            overflow: "hidden",
            background: "#020617",
            flexShrink: 0,
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

        {/* Title + chips */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 4,
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
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(75,85,99,0.9)",
                color: "#cbd5f5",
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
          minWidth: 170,
          fontSize: 13,
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: "#22c55e",
            marginBottom: 2,
          }}
        >
          {offer.price != null ? `$${offer.price.toFixed(2)}` : "—"}
        </div>

        {marketAvg != null && (
          <div style={{ fontSize: 13, marginBottom: 2 }}>
            <span style={{ fontWeight: 600 }}>${marketAvg.toFixed(2)}</span>{" "}
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
              marginTop: 2,
              color: "#a5b4fc",
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
