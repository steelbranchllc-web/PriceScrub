export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY!;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN!;
const FB_TASK_ID = process.env.APIFY_FB_TASK_ID!;
const EBAY_TASK_ID = process.env.APIFY_EBAY_TASK_ID!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Basic assumptions for flipper profit model
const PLATFORM_FEE_RATE = 0.13; // 13% fees
const SHIPPING_ESTIMATE = 12; // fallback shipping assumption

// Outlier thresholds vs market average (Google)
const OUTLIER_MIN_RATIO = 0.2; // keep listings >= 20% of market avg
const OUTLIER_MAX_RATIO = 3.0; // keep listings <= 3x market avg

// ---------- Types ----------
type PriceStats = {
  median: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
};

export type AnalyzedOffer = {
  id: string;
  title: string;
  price: number | null;
  currency: string | null;
  url: string;
  source: string; // Human-readable retailer
  imageUrl?: string | null;
  location?: string | null;

  estimatedFees?: number | null;
  estimatedShipping?: number | null;
  estimatedProfit?: number | null;
  profitMarginPct?: number | null; // ROI vs market price

  discountPctVsMedian?: number | null;

  productMarketStats?: PriceStats | null;
  discountPctVsProductMedian?: number | null;

  // AI demand info
  demandLabel?: string | null; // "Low" | "Medium" | "High"
  estimatedSellTime?: string | null; // e.g. "3–7 days"

  // AI “true value” logic for ALL categories
  aiTrueValue?: number | null; // realistic resale value
  aiConfidence?: number | null; // 0–1
  aiDemandScore?: number | null; // 1–5
  aiSellTimeDaysMin?: number | null;
  aiSellTimeDaysMax?: number | null;
  aiShouldIgnore?: boolean | null; // obvious trash/mispriced

  // AI authenticity / fake-product filtering
  aiIsLikelyAuthentic?: boolean | null;
  aiRiskLevel?: "low" | "medium" | "high" | null;
  aiAuthenticityWarnings?: string[] | null;
  aiAuthenticityExplanation?: string | null;
  aiBlockFromResults?: boolean | null;

  raw?: any;
};

export type SearchResponse = {
  listings: AnalyzedOffer[];
  issues?: string[];
  priceStats?: {
    overall: PriceStats;
    bySource: Record<string, PriceStats>;
    byProduct: Record<string, PriceStats>;
  };
};

// ---------- Utility: compute stats ----------
function computePriceStats(prices: number[]): PriceStats {
  if (!prices.length) {
    return { median: null, average: null, min: null, max: null };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const average = sum / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  return { median, average, min, max };
}

function normalizeProductKey(title: string | null | undefined): string {
  if (!title) return "";
  return title.toLowerCase().trim();
}

// Compute internal stats & discounts (before Google enrichment)
function addStatsAndDiscounts(listings: AnalyzedOffer[]): {
  listings: AnalyzedOffer[];
  stats: {
    overall: PriceStats;
    bySource: Record<string, PriceStats>;
    byProduct: Record<string, PriceStats>;
  };
} {
  const bySourcePrices: Record<string, number[]> = {};
  const byProductPrices: Record<string, number[]> = {};
  const allPrices: number[] = [];

  for (const l of listings) {
    if (l.price != null) {
      allPrices.push(l.price);

      if (!bySourcePrices[l.source]) bySourcePrices[l.source] = [];
      bySourcePrices[l.source].push(l.price);

      const key = normalizeProductKey(l.title);
      if (!byProductPrices[key]) byProductPrices[key] = [];
      byProductPrices[key].push(l.price);
    }
  }

  const bySourceStats: Record<string, PriceStats> = {};
  for (const [source, prices] of Object.entries(bySourcePrices)) {
    bySourceStats[source] = computePriceStats(prices);
  }

  const byProductStats: Record<string, PriceStats> = {};
  for (const [prodKey, prices] of Object.entries(byProductPrices)) {
    byProductStats[prodKey] = computePriceStats(prices);
  }

  const overall = computePriceStats(allPrices);

  const listingsWithDiscounts = listings.map((l) => {
    let productStats: PriceStats | null = null;
    let productDiscountPct: number | null = null;
    let discountPctVsMedian: number | null = null;

    if (l.price != null) {
      const pKey = normalizeProductKey(l.title);
      const pStats = byProductStats[pKey];

      if (pStats && pStats.median != null) {
        productStats = pStats;
        const median = pStats.median;
        productDiscountPct = ((median - l.price) / median) * 100;
        discountPctVsMedian = productDiscountPct;
      } else {
        const sStats = bySourceStats[l.source];
        if (sStats && sStats.median != null) {
          const median = sStats.median;
          discountPctVsMedian = ((median - l.price) / median) * 100;
        }
      }
    }

    return {
      ...l,
      productMarketStats: productStats,
      discountPctVsProductMedian: productDiscountPct,
      discountPctVsMedian,
    };
  });

  return {
    listings: listingsWithDiscounts,
    stats: {
      overall,
      bySource: bySourceStats,
      byProduct: byProductStats,
    },
  };
}

// ---------- Google analytics helpers ----------
function parsePriceFromAny(val: unknown): number | null {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseShippingFromAny(val: unknown): number | null {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === "string") {
    const lower = val.toLowerCase();
    if (lower.includes("free")) return 0;
    return parsePriceFromAny(val);
  }
  return null;
}

// 🔍 Try to extract a size token from the title (e.g. "10.5")
function extractSizeTokenFromTitle(title: string): string | null {
  const lower = title.toLowerCase();

  if (
    !/(size|sz|\bmen'?s|\bwomen'?s|\bwmns\b|\byouth|\bkids\b)/.test(lower)
  ) {
    return null;
  }

  const match = lower.match(/\b(\d{1,2}(?:\.5)?)\b/);
  if (!match) return null;

  return match[1];
}

async function fetchGoogleStatsForTitle(
  title: string
): Promise<{ avgPrice: number | null; avgShipping: number | null }> {
  if (!SERPAPI_API_KEY) {
    console.error("Missing SERPAPI_API_KEY, skipping Google stats");
    return { avgPrice: null, avgShipping: null };
  }

  const params: Record<string, string> = {
    api_key: SERPAPI_API_KEY,
    engine: "google_shopping",
    q: title,
    hl: "en",
    gl: "us",
    num: "20",
  };

  const url =
    "https://serpapi.com/search?" + new URLSearchParams(params).toString();

  const res = await fetch(url);
  if (!res.ok) {
    console.error("❌ SerpAPI error for title stats:", await res.text());
    return { avgPrice: null, avgShipping: null };
  }

  const data = await res.json();
  const results: any[] = data.shopping_results || [];

  const prices: number[] = [];
  const shippings: number[] = [];

  const sizeToken = extractSizeTokenFromTitle(title);

  for (const item of results) {
    const itemTitle = (item.title || "").toString().toLowerCase();

    // Size-aware filter when possible
    if (sizeToken && !itemTitle.includes(sizeToken.toLowerCase())) {
      continue;
    }

    const p = parsePriceFromAny(
      item.price ?? item.extracted_price ?? item.price_with_tax
    );
    if (p != null && p > 0) prices.push(p);

    const s = parseShippingFromAny(item.shipping);
    if (s != null && s >= 0) shippings.push(s);
  }

  let avgPrice: number | null = null;
  let avgShipping: number | null = null;

  if (prices.length) {
    const sorted = prices.slice().sort((a, b) => a - b);
    const trim = Math.floor(sorted.length * 0.2);
    const trimmed =
      sorted.length > 2 * trim
        ? sorted.slice(trim, sorted.length - trim)
        : sorted;

    const sum = trimmed.reduce((a, b) => a + b, 0);
    avgPrice = sum / trimmed.length;
  }

  if (shippings.length) {
    const sumS = shippings.reduce((a, b) => a + b, 0);
    avgShipping = sumS / shippings.length;
  }

  return { avgPrice, avgShipping };
}

// ---------- SerpAPI (retail sites) ----------
function mapSerpItemToOffer(item: any, siteLabel: string): AnalyzedOffer {
  const priceStr: string | undefined =
    item.price ||
    item.extracted_price?.toString() ||
    item.price_with_tax ||
    undefined;

  let price: number | null = null;
  if (priceStr) {
    const numeric = priceStr.toString().replace(/[^0-9.]/g, "");
    const n = Number(numeric);
    if (!Number.isNaN(n)) price = n;
  }

  const currency: string | null = item.currency || item.currency_symbol || null;

  const retailer: string =
    (item.source as string) || (item.seller as string) || siteLabel;

  let fees: number | null = null;
  let shipping: number | null = null;
  let profit: number | null = null;
  let marginPct: number | null = null;

  if (price != null) {
    fees = price * PLATFORM_FEE_RATE;
    shipping = SHIPPING_ESTIMATE;
    profit = price - fees - shipping;
    marginPct = (profit / price) * 100;
  }

  const baseId =
    item.product_id ||
    item.serpapi_product_id ||
    item.offer_id ||
    item.position ||
    item.link;

  const id = `${siteLabel}-${String(baseId)}`;

  return {
    id,
    title: item.title || "Untitled listing",
    price,
    currency,
    url: item.link,
    source: retailer,
    imageUrl: item.thumbnail || item.image || null,
    location: item.seller || retailer || null,
    estimatedFees: fees,
    estimatedShipping: shipping,
    estimatedProfit: profit,
    profitMarginPct: marginPct,
    raw: item,
  };
}

async function searchRetailSites(
  query: string,
  site: string | "any"
): Promise<AnalyzedOffer[]> {
  if (!SERPAPI_API_KEY) return [];

  const params: Record<string, string> = {
    api_key: SERPAPI_API_KEY,
    engine: "google_shopping",
    q: query,
    hl: "en",
    gl: "us",
    num: "50",
  };

  const siteDomainMap: Record<string, string> = {
    ebay: "ebay.com",
    amazon: "amazon.com",
    walmart: "walmart.com",
    "best buy": "bestbuy.com",
    target: "target.com",
    stockx: "stockx.com",
    goat: "goat.com",
    poshmark: "poshmark.com",
    mercari: "mercari.com",
    grailed: "grailed.com",
    craigslist: "craigslist.org",
    offerup: "offerup.com",
  };

  let label = "All Retailers";

  if (site !== "any" && siteDomainMap[site]) {
    params["store"] = siteDomainMap[site];
    label = site;
  }

  const searchUrl =
    "https://serpapi.com/search?" + new URLSearchParams(params).toString();

  const res = await fetch(searchUrl);

  if (!res.ok) {
    console.error("❌ SerpAPI error:", await res.text());
    return [];
  }

  const data = await res.json();
  const results: any[] =
    data.shopping_results || data.organic_results || [];

  return results.map((item) => mapSerpItemToOffer(item, label));
}

// ---------- Facebook / Apify ----------
const FB_COUNT = 1000;

function mapFacebookItemToOffer(item: any): AnalyzedOffer {
  let price: number | null = null;
  if (item.listing_price?.amount) {
    const n = Number(item.listing_price.amount);
    if (!Number.isNaN(n)) price = n;
  } else if (item.formatted_price?.text) {
    const numeric = item.formatted_price.text.replace(/[^0-9.]/g, "");
    const n = Number(numeric);
    if (!Number.isNaN(n)) price = n;
  }

  const imageUrl =
    item.primary_listing_photo?.listing_image?.uri ||
    item.primary_listing_photo?.image?.uri ||
    (Array.isArray(item.listing_photos) &&
      item.listing_photos[0]?.image?.uri) ||
    null;

  const url =
    item.story?.url ||
    (item.id
      ? `https://www.facebook.com/marketplace/item/${item.id}/`
      : "");

  const location =
    item.location_text?.text ||
    item.location?.reverse_geocode?.city ||
    null;

  const title =
    item.custom_title ||
    item.marketplace_listing_title ||
    "Untitled listing";

  let fees: number | null = null;
  let shipping: number | null = null;
  let profit: number | null = null;
  let marginPct: number | null = null;

  if (price != null) {
    fees = price * PLATFORM_FEE_RATE;
    shipping = SHIPPING_ESTIMATE;
    profit = price - fees - shipping;
    marginPct = (profit / price) * 100;
  }

  return {
    id: `fb-${String(item.id)}`,
    title,
    price,
    currency: "USD",
    url,
    source: "Facebook Marketplace",
    imageUrl,
    location,
    estimatedFees: fees,
    estimatedShipping: shipping,
    estimatedProfit: profit,
    profitMarginPct: marginPct,
    raw: item,
  };
}

async function scrapeFacebookListings(
  query: string
): Promise<AnalyzedOffer[]> {
  if (!APIFY_API_TOKEN || !FB_TASK_ID) {
    console.error("Missing APIFY_API_TOKEN or FB_TASK_ID");
    return [];
  }

  const fbUrl = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(
    query
  )}`;

  console.log("🔥 Scraping FB URL:", fbUrl);

  const runRes = await fetch(
    `https://api.apify.com/v2/actor-tasks/${FB_TASK_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=180`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [fbUrl],
        deepScrape: false,
        maxItems: FB_COUNT,
        maxItemsPerStartUrl: FB_COUNT,
        proxy: {
          useApifyProxy: true,
          countryCode: "US",
        },
      }),
    }
  );

  if (!runRes.ok) {
    const text = await runRes.text();
    console.error("❌ Apify FB run failed (HTTP):", text);
    throw new Error("Facebook scraper HTTP error");
  }

  const runJson = await runRes.json();
  const run = runJson.data;

  if (!run) {
    console.error("❌ No run data returned from Apify:", runJson);
    throw new Error("Facebook scraper returned no run data");
  }

  if (run.status !== "SUCCEEDED") {
    console.error(
      "❌ Apify run did not succeed:",
      run.status,
      run.statusMessage
    );
    throw new Error(run.statusMessage || "Facebook scraper failed");
  }

  const datasetId =
    run.defaultDatasetId ||
    run.output?.defaultDatasetId ||
    run.defaultDatasetId;

  if (!datasetId) {
    console.error("❌ No datasetId found on run:", run);
    throw new Error("Facebook scraper returned no dataset");
  }

  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&clean=true&limit=${FB_COUNT}`
  );

  if (!datasetRes.ok) {
    const text = await datasetRes.text();
    console.error("❌ Failed to fetch dataset items:", text);
    throw new Error("Failed to read scraped data");
  }

  const rawItems: any[] = await datasetRes.json();
  console.log(`✅ Got ${rawItems.length} FB listings from Apify`);

  const offers = rawItems.map(mapFacebookItemToOffer);

  const uniqueMap = new Map<string, AnalyzedOffer>();
  for (const o of offers) {
    if (!uniqueMap.has(o.id)) uniqueMap.set(o.id, o);
  }

  return Array.from(uniqueMap.values());
}

// ---------- eBay / Apify ----------
const EBAY_COUNT = 1000;

function mapEbayItemToOffer(item: any): AnalyzedOffer {
  let price: number | null = null;

  if (item.price?.amount) {
    const n = Number(item.price.amount);
    if (!Number.isNaN(n)) price = n;
  } else if (item.currentPrice?.value) {
    const n = Number(item.currentPrice.value);
    if (!Number.isNaN(n)) price = n;
  } else if (item.sellingStatus?.currentPrice?.value) {
    const n = Number(item.sellingStatus.currentPrice.value);
    if (!Number.isNaN(n)) price = n;
  } else if (typeof item.price === "string") {
    const numeric = item.price.replace(/[^0-9.]/g, "");
    const n = Number(numeric);
    if (!Number.isNaN(n)) price = n;
  }

  const currency: string | null =
    item.price?.currency ||
    item.currentPrice?.currency ||
    item.sellingStatus?.currentPrice?.currency ||
    item.currency ||
    "USD";

  const imageUrl =
    item.imageUrl ||
    item.image ||
    item.galleryURL ||
    item.thumbnail ||
    null;

  const url =
    item.url ||
    item.viewItemURL ||
    item.detailPageURL ||
    "";

  const location =
    item.location ||
    item.sellerLocation ||
    null;

  const title = item.title || "Untitled listing";

  let fees: number | null = null;
  let shipping: number | null = null;
  let profit: number | null = null;
  let marginPct: number | null = null;

  if (price != null) {
    fees = price * PLATFORM_FEE_RATE;
    shipping = SHIPPING_ESTIMATE;
    profit = price - fees - shipping;
    marginPct = (profit / price) * 100;
  }

  const baseId = item.id || item.itemId || item.listingId || url;

  return {
    id: `eb-${String(baseId)}`,
    title,
    price,
    currency,
    url,
    source: "eBay",
    imageUrl,
    location,
    estimatedFees: fees,
    estimatedShipping: shipping,
    estimatedProfit: profit,
    profitMarginPct: marginPct,
    raw: item,
  };
}

async function scrapeEbayListings(query: string): Promise<AnalyzedOffer[]> {
  if (!APIFY_API_TOKEN || !EBAY_TASK_ID) {
    console.error("Missing APIFY_API_TOKEN or EBAY_TASK_ID");
    return [];
  }

  console.log("🔥 Scraping eBay for query:", query);

  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    query
  )}`;

  const payload = {
    count: EBAY_COUNT,
    deepScrape: false,
    proxy: {
      useApifyProxy: true,
      countryCode: "US",
    },
    startUrls: [
      {
        url: ebayUrl,
      },
    ],
  };

  const runRes = await fetch(
    `https://api.apify.com/v2/actor-tasks/${EBAY_TASK_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=180`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!runRes.ok) {
    const text = await runRes.text();
    console.error("❌ Apify eBay run failed (HTTP):", text);
    throw new Error("eBay scraper HTTP error");
  }

  const runJson = await runRes.json();
  const run = runJson.data;

  if (!run) {
    console.error("❌ No run data returned from Apify eBay:", runJson);
    throw new Error("eBay scraper returned no run data");
  }

  if (run.status !== "SUCCEEDED") {
    console.error(
      "❌ Apify eBay run did not succeed:",
      run.status,
      run.statusMessage
    );
    throw new Error(run.statusMessage || "eBay scraper failed");
  }

  const datasetId =
    run.defaultDatasetId ||
    run.output?.defaultDatasetId ||
    run.defaultDatasetId;

  if (!datasetId) {
    console.error("❌ No datasetId found on eBay run:", run);
    throw new Error("eBay scraper returned no dataset");
  }

  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&clean=true&limit=${EBAY_COUNT}`
  );

  if (!datasetRes.ok) {
    const text = await datasetRes.text();
    console.error("❌ Failed to fetch eBay dataset items:", text);
    throw new Error("Failed to read eBay scraped data");
  }

  const rawItems: any[] = await datasetRes.json();
  console.log(`✅ Got ${rawItems.length} eBay listings from Apify`);

  const offers = rawItems.map(mapEbayItemToOffer);

  const uniqueMap = new Map<string, AnalyzedOffer>();
  for (const o of offers) {
    if (!uniqueMap.has(o.id)) uniqueMap.set(o.id, o);
  }

  return Array.from(uniqueMap.values());
}

// ---------- AI: true value + demand + sell-time ----------
type AiPricingResult = {
  id: string;
  trueMarketPrice?: number | null;
  confidence?: number | null;
  demandLabel?: string | null;
  demandScore?: number | null;
  sellTimeLabel?: string | null;
  sellTimeDaysMin?: number | null;
  sellTimeDaysMax?: number | null;
  ignore?: boolean | null;
};

async function getAiPricingAndDemand(
  listings: AnalyzedOffer[]
): Promise<Record<string, AiPricingResult>> {
  try {
    if (!OPENAI_API_KEY || listings.length === 0) return {};

    const sample = listings.slice(0, 40);

    const compact = sample.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      source: l.source,
      googleAvg: l.productMarketStats?.average ?? null,
      googleDiscountPct: l.discountPctVsProductMedian ?? null,
    }));

    const prompt = `
You are an expert reseller and pricing analyst across ALL categories:
- watches (luxury and mid-range)
- sneakers and shoes
- streetwear and designer clothing
- golf clubs and sports equipment
- electronics, collectibles, and other resale inventory.

You get a JSON array of items with:
- id
- title
- price (current listing price)
- googleAvg (rough Google Shopping average)
- googleDiscountPct (discount vs Google avg)
- source (eBay, Facebook Marketplace, StockX, GOAT, etc.)

For EACH item, do this:

1. Estimate a realistic **trueMarketPrice**:
   - This is what a serious buyer will actually pay in the current market, not some troll listing.
   - Treat Google averages as a hint, but ignore clearly insane or one-off prices.

2. Work across categories and consider size/brand as context.

3. Return:
   - trueMarketPrice
   - confidence (0–1)
   - demandLabel ("Low" | "Medium" | "High")
   - demandScore (1–5)
   - sellTimeLabel ("1-3 days", "3-7 days", "1-2 weeks", "2-4 weeks", "1-3 months")
   - sellTimeDaysMin / sellTimeDaysMax
   - ignore (true if the listing should not be used at all).

Return ONLY JSON array (no markdown).

Items:
${JSON.stringify(compact)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a precise resale pricing engine for all categories, focused on realistic 'true value' and demand.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content ?? "[]";

    let parsed: AiPricingResult[] = [];

    try {
      let clean = content?.trim() || "";

      clean = clean.replace(/```json/gi, "").replace(/```/g, "").trim();
      const firstBracket = clean.indexOf("[");
      const lastBracket = clean.lastIndexOf("]");

      if (firstBracket !== -1 && lastBracket !== -1) {
        clean = clean.substring(firstBracket, lastBracket + 1);
      }

      parsed = JSON.parse(clean) as AiPricingResult[];

      if (!Array.isArray(parsed)) {
        console.warn("AI pricing JSON was not an array. Returning empty map.");
        parsed = [];
      }
    } catch (err) {
      console.error("❌ Failed to parse AI pricing JSON:", err, content);
      parsed = [];
    }

    const map: Record<string, AiPricingResult> = {};
    for (const row of parsed) {
      if (!row || !row.id) continue;
      map[row.id] = {
        id: row.id,
        trueMarketPrice:
          typeof row.trueMarketPrice === "number"
            ? row.trueMarketPrice
            : null,
        confidence:
          typeof row.confidence === "number" ? row.confidence : null,
        demandLabel: row.demandLabel ?? null,
        demandScore:
          typeof row.demandScore === "number" ? row.demandScore : null,
        sellTimeLabel: row.sellTimeLabel ?? null,
        sellTimeDaysMin:
          typeof row.sellTimeDaysMin === "number"
            ? row.sellTimeDaysMin
            : null,
        sellTimeDaysMax:
          typeof row.sellTimeDaysMax === "number"
            ? row.sellTimeDaysMax
            : null,
        ignore: !!row.ignore,
      };
    }

    return map;
  } catch (err) {
    console.error("OpenAI pricing/demand error:", err);
    return {};
  }
}

// ---------- AI: authenticity / fake-product filter ----------
type AiAuthenticityResult = {
  id: string;
  isLikelyAuthentic?: boolean | null;
  riskLevel?: "low" | "medium" | "high" | null;
  warnings?: string[] | null;
  explanation?: string | null;
  blockFromResults?: boolean | null;
};

async function getAiAuthenticityJudgments(
  listings: AnalyzedOffer[]
): Promise<Record<string, AiAuthenticityResult>> {
  try {
    if (!OPENAI_API_KEY || listings.length === 0) return {};

    const sample = listings.slice(0, 40);

    const compact = sample.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      source: l.source,
      url: l.url,
      googleAvg: l.productMarketStats?.average ?? null,
      discountPct:
        l.discountPctVsProductMedian ?? l.discountPctVsMedian ?? null,
    }));

    const prompt = `
You are the Authenticity & Fraud Detection Engine for a flipping marketplace.

You get a JSON array of items with:
- id
- title
- price
- source
- url
- googleAvg
- discountPct

Detect obvious fakes/scams, especially luxury and hype items.
Be aggressive. If it looks wrong, treat risk as HIGH.

Return ONLY JSON array with:
- id
- isLikelyAuthentic (true/false)
- riskLevel ("low" | "medium" | "high")
- warnings (string[])
- explanation (string)
- blockFromResults (true/false)

Items:
${JSON.stringify(compact)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a strict authenticity filter. Prioritize protecting users from fakes and scams.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content ?? "[]";

    let parsed: AiAuthenticityResult[] = [];

    try {
      let clean = content?.trim() || "";
      clean = clean.replace(/```json/gi, "").replace(/```/g, "").trim();

      const firstBracket = clean.indexOf("[");
      const lastBracket = clean.lastIndexOf("]");

      if (firstBracket !== -1 && lastBracket !== -1) {
        clean = clean.substring(firstBracket, lastBracket + 1);
      }

      parsed = JSON.parse(clean) as AiAuthenticityResult[];

      if (!Array.isArray(parsed)) {
        console.warn(
          "AI authenticity JSON was not an array. Returning empty map."
        );
        parsed = [];
      }
    } catch (err) {
      console.error("❌ Failed to parse AI authenticity JSON:", err, content);
      parsed = [];
    }

    const map: Record<string, AiAuthenticityResult> = {};
    for (const row of parsed) {
      if (!row || !row.id) continue;
      map[row.id] = {
        id: row.id,
        isLikelyAuthentic:
          typeof row.isLikelyAuthentic === "boolean"
            ? row.isLikelyAuthentic
            : null,
        riskLevel: row.riskLevel ?? null,
        warnings: Array.isArray(row.warnings) ? row.warnings : null,
        explanation: row.explanation ?? null,
        blockFromResults:
          typeof row.blockFromResults === "boolean"
            ? row.blockFromResults
            : null,
      };
    }

    return map;
  } catch (err) {
    console.error("OpenAI authenticity error:", err);
    return {};
  }
}

// ---------- Route handler ----------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body.query || "").trim();
    const site = (body.site || "any") as string;

    if (!query) {
      return NextResponse.json(
        { error: "Missing query" },
        { status: 400 }
      );
    }

    const issues: string[] = [];
    let listings: AnalyzedOffer[] = [];

    // Retail (skip aggregator when only facebook or ebay is requested explicitly)
    if (site !== "facebook" && site !== "ebay") {
      try {
        const retailOffers = await searchRetailSites(query, site as any);
        listings = listings.concat(retailOffers);
      } catch (err) {
        console.error("Retail search error:", err);
        issues.push("Retail search failed");
      }
    }

    // Facebook Marketplace
    if (site === "facebook" || site === "any") {
      try {
        const fbOffers = await scrapeFacebookListings(query);
        listings = listings.concat(fbOffers);
      } catch (err) {
        console.error("Facebook scraper error:", err);
        issues.push("Facebook scraper failed");
      }
    }

    // eBay (Apify)
    if (site === "ebay" || site === "any") {
      try {
        const ebayOffers = await scrapeEbayListings(query);
        listings = listings.concat(ebayOffers);
      } catch (err) {
        console.error("eBay scraper error:", err);
        issues.push("eBay scraper failed");
      }
    }

    // 🔁 Global dedupe
    const dedupedMap = new Map<string, AnalyzedOffer>();
    for (const l of listings) {
      const id = l.id || String(l.url);
      if (!dedupedMap.has(id)) dedupedMap.set(id, l);
    }
    listings = Array.from(dedupedMap.values());

    // Internal stats first
    const {
      listings: enrichedListings,
      stats,
    } = addStatsAndDiscounts(listings);

    console.log(
      "🔍 Returning listings count (pre-Google analytics):",
      enrichedListings.length
    );

    // Google analytics
    const listingsWithGoogle = await Promise.all(
      enrichedListings.map(async (l) => {
        if (!l.title || l.price == null) return l;

        const { avgPrice, avgShipping } = await fetchGoogleStatsForTitle(
          l.title
        );

        if (avgPrice == null) {
          return {
            ...l,
            estimatedShipping:
              avgShipping != null
                ? avgShipping
                : l.estimatedShipping ?? SHIPPING_ESTIMATE,
          };
        }

        const shippingCost =
          avgShipping != null
            ? avgShipping
            : l.estimatedShipping ?? SHIPPING_ESTIMATE;

        const fees = l.price * PLATFORM_FEE_RATE;
        const profit = avgPrice - l.price - fees - shippingCost;
        const roi = l.price > 0 ? (profit / l.price) * 100 : null;

        const discountVsAvg = ((avgPrice - l.price) / avgPrice) * 100;

        const googleStatsForThis: PriceStats = {
          median: null,
          average: avgPrice,
          min: null,
          max: null,
        };

        return {
          ...l,
          estimatedFees: fees,
          estimatedShipping: shippingCost,
          estimatedProfit: profit,
          profitMarginPct: roi,
          productMarketStats: googleStatsForThis,
          discountPctVsProductMedian: discountVsAvg,
          discountPctVsMedian: discountVsAvg,
        };
      })
    );

    console.log(
      "🔍 Returning listings count (post-Google analytics):",
      listingsWithGoogle.length
    );

    // 🧹 Basic pre-AI filter
    const prelimFilteredListings = listingsWithGoogle.filter((l) => {
      const price = l.price;
      const avg = l.productMarketStats?.average ?? null;

      if (price == null || price <= 0) return false;
      if (l.profitMarginPct == null) return false;
      if (l.profitMarginPct <= 0) return false;

      if (avg == null || avg <= 0) return true;

      const ratio = price / avg;
      return ratio >= OUTLIER_MIN_RATIO && ratio <= OUTLIER_MAX_RATIO;
    });

    console.log(
      "🧹 After ROI + outlier filter (pre-AI), listings count:",
      prelimFilteredListings.length
    );

    // 🤖 AI authenticity + pricing
    const authenticityMap = await getAiAuthenticityJudgments(
      prelimFilteredListings
    );
    const aiMap = await getAiPricingAndDemand(prelimFilteredListings);

    // Merge AI data
    const listingsWithAi = prelimFilteredListings.map((l) => {
      const ai = aiMap[l.id];
      const auth = authenticityMap[l.id];

      const price = l.price ?? 0;
      const baseFees =
        l.estimatedFees != null ? l.estimatedFees : price * PLATFORM_FEE_RATE;
      const baseShipping =
        l.estimatedShipping != null ? l.estimatedShipping : SHIPPING_ESTIMATE;

      let aiProfit: number | null = l.estimatedProfit ?? null;
      let aiRoi: number | null = l.profitMarginPct ?? null;

      if (ai?.trueMarketPrice != null && price > 0) {
        const profit = ai.trueMarketPrice - price - baseFees - baseShipping;
        const roi = (profit / price) * 100;
        aiProfit = profit;
        aiRoi = roi;
      }

      const effectiveAvg =
        ai?.trueMarketPrice ??
        l.productMarketStats?.average ??
        null;

      const discountPct =
        effectiveAvg && price > 0
          ? ((effectiveAvg - price) / effectiveAvg) * 100
          : l.discountPctVsProductMedian ?? l.discountPctVsMedian ?? null;

      return {
        ...l,
        estimatedFees: baseFees,
        estimatedShipping: baseShipping,
        estimatedProfit: aiProfit,
        profitMarginPct: aiRoi,
        productMarketStats: {
          ...(l.productMarketStats || {
            median: null,
            min: null,
            max: null,
            average: null,
          }),
          average: effectiveAvg,
        },
        discountPctVsProductMedian: discountPct,
        discountPctVsMedian: discountPct,
        aiTrueValue: ai?.trueMarketPrice ?? null,
        aiConfidence: ai?.confidence ?? null,
        aiDemandScore: ai?.demandScore ?? null,
        aiSellTimeDaysMin: ai?.sellTimeDaysMin ?? null,
        aiSellTimeDaysMax: ai?.sellTimeDaysMax ?? null,
        aiShouldIgnore: ai?.ignore ?? false,
        demandLabel: ai?.demandLabel ?? l.demandLabel ?? null,
        estimatedSellTime: ai?.sellTimeLabel ?? l.estimatedSellTime ?? null,
        aiIsLikelyAuthentic: auth?.isLikelyAuthentic ?? null,
        aiRiskLevel: auth?.riskLevel ?? null,
        aiAuthenticityWarnings: auth?.warnings ?? null,
        aiAuthenticityExplanation: auth?.explanation ?? null,
        aiBlockFromResults: auth?.blockFromResults ?? null,
      };
    });

    // 🧹 FINAL FILTER:
    // - drop AI-ignore
    // - drop authenticity blocks/high risk
    // - drop 0% or negative ROI
    const filteredListings = listingsWithAi.filter((l) => {
      if (l.aiShouldIgnore) return false;
      if (l.aiBlockFromResults) return false;
      if (l.aiRiskLevel === "high") return false;
      if (l.profitMarginPct == null || l.profitMarginPct <= 0) return false;
      return true;
    });

    console.log(
      "🧹 After AI ignore + authenticity + ROI>0 filter, listings count:",
      filteredListings.length
    );

    const filteredOverall = computePriceStats(
      filteredListings
        .filter((l) => l.price != null)
        .map((l) => l.price as number)
    );

    const filteredStats: SearchResponse["priceStats"] = {
      ...stats,
      overall: filteredOverall,
    };

    const res: SearchResponse = {
      listings: filteredListings,
      issues: issues.length ? issues : undefined,
      priceStats: filteredStats,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error in search route:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
