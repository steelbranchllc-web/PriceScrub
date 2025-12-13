export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY!;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN!;
const FB_TASK_ID = process.env.APIFY_FB_TASK_ID!;
const EBAY_TASK_ID = process.env.APIFY_EBAY_TASK_ID!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------- Basic assumptions ----------
const PLATFORM_FEE_RATE = 0.13; // 13% fees
const SHIPPING_ESTIMATE = 12; // fallback shipping assumption

// Outlier thresholds vs *internal* stats (not Google)
const OUTLIER_MIN_RATIO = 0.15;
const OUTLIER_MAX_RATIO = 4.0;

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
  profitMarginPct?: number | null; // ROI vs AI true value

  // Internal stats
  discountPctVsMedian?: number | null;
  productMarketStats?: PriceStats | null;
  discountPctVsProductMedian?: number | null;

  // AI demand info
  demandLabel?: string | null; // "Low" | "Medium" | "High"
  estimatedSellTime?: string | null; // e.g. "3–7 days"

  // AI “true value” logic for ALL categories
  aiTrueValue?: number | null; // legacy name
  aiEstimatedValue?: number | null; // <- what UI will read
  aiConfidence?: number | null; // 0–1
  aiDemandScore?: number | null; // 1–5
  aiSellTimeDaysMin?: number | null;
  aiSellTimeDaysMax?: number | null;
  aiShouldIgnore?: boolean | null; // obvious trash/mispriced

  // NEW: make this an actual flipping engine
  aiPriceRangeLow?: number | null;
  aiPriceRangeHigh?: number | null;
  aiMaxBuyPrice?: number | null; // “buy at or below this”

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
  if (!prices.length) return { median: null, average: null, min: null, max: null };

  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const average = sum / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  return { median, average, min, max };
}

function normalizeProductKey(title: string | null | undefined): string {
  if (!title) return "";
  return title.toLowerCase().trim();
}

// ---------- Robust JSON parsing (fixes your “unterminated string” failures) ----------
function extractJsonObject(text: string): string | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

function safeParseJsonObject<T = any>(raw: string): T | null {
  // 1) try direct
  try {
    return JSON.parse(raw) as T;
  } catch {}

  // 2) try extracting JSON object from surrounding text
  const extracted = extractJsonObject(raw);
  if (extracted) {
    try {
      return JSON.parse(extracted) as T;
    } catch {}
  }

  return null;
}

// Compute internal stats & discounts (just from the scraped listings)
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

// ---------- SerpAPI (retail sites) ----------
function mapSerpItemToOffer(item: any, siteLabel: string): AnalyzedOffer {
  const priceStr: string | undefined =
    item.price || item.extracted_price?.toString() || item.price_with_tax || undefined;

  let price: number | null = null;
  if (priceStr) {
    const numeric = priceStr.toString().replace(/[^0-9.]/g, "");
    const n = Number(numeric);
    if (!Number.isNaN(n)) price = n;
  }

  const currency: string | null = item.currency || item.currency_symbol || null;
  const retailer: string = (item.source as string) || (item.seller as string) || siteLabel;

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
    item.product_id || item.serpapi_product_id || item.offer_id || item.position || item.link;

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

async function searchRetailSites(query: string, site: string | "any"): Promise<AnalyzedOffer[]> {
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

  const searchUrl = "https://serpapi.com/search?" + new URLSearchParams(params).toString();
  const res = await fetch(searchUrl);

  if (!res.ok) {
    console.error("❌ SerpAPI error:", await res.text());
    return [];
  }

  const data = await res.json();
  const results: any[] = data.shopping_results || data.organic_results || [];

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
    (Array.isArray(item.listing_photos) && item.listing_photos[0]?.image?.uri) ||
    null;

  const url =
    item.story?.url || (item.id ? `https://www.facebook.com/marketplace/item/${item.id}/` : "");

  const location = item.location_text?.text || item.location?.reverse_geocode?.city || null;

  const title = item.custom_title || item.marketplace_listing_title || "Untitled listing";

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

async function scrapeFacebookListings(query: string): Promise<AnalyzedOffer[]> {
  if (!APIFY_API_TOKEN || !FB_TASK_ID) {
    console.error("Missing APIFY_API_TOKEN or FB_TASK_ID");
    return [];
  }

  const fbUrl = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}`;
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
        proxy: { useApifyProxy: true, countryCode: "US" },
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
    console.error("❌ Apify run did not succeed:", run.status, run.statusMessage);
    throw new Error(run.statusMessage || "Facebook scraper failed");
  }

  const datasetId = run.defaultDatasetId || run.output?.defaultDatasetId || run.defaultDatasetId;

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
  for (const o of offers) if (!uniqueMap.has(o.id)) uniqueMap.set(o.id, o);

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

  const imageUrl = item.imageUrl || item.image || item.galleryURL || item.thumbnail || null;
  const url = item.url || item.viewItemURL || item.detailPageURL || "";
  const location = item.location || item.sellerLocation || null;
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

  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;

  const payload = {
    count: EBAY_COUNT,
    deepScrape: false,
    proxy: { useApifyProxy: true, countryCode: "US" },
    startUrls: [{ url: ebayUrl }],
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
    console.error("❌ Apify eBay run did not succeed:", run.status, run.statusMessage);
    throw new Error(run.statusMessage || "eBay scraper failed");
  }

  const datasetId = run.defaultDatasetId || run.output?.defaultDatasetId || run.defaultDatasetId;

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
  for (const o of offers) if (!uniqueMap.has(o.id)) uniqueMap.set(o.id, o);

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

  // NEW:
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  maxBuyPrice?: number | null; // “deal line”
};

type AiPricingEnvelope = { items?: AiPricingResult[] };

async function getAiPricingAndDemand(listings: AnalyzedOffer[]): Promise<Record<string, AiPricingResult>> {
  try {
    if (!OPENAI_API_KEY || listings.length === 0) return {};

    // Cap at 40 for token sanity
    const sample = listings.slice(0, 40);

    const compact = sample.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      source: l.source,
      location: l.location ?? null,
    }));

    // VERY STRICT JSON-only instruction (helps prevent malformed JSON)
    const prompt = `
You are a strict JSON pricing engine for flipping. Return ONLY valid JSON.

You receive listings:
- id
- title
- price (ask)
- source
- location

For EACH listing:
- Estimate trueMarketPrice (what it will SELL for in the current market).
- Provide confidence (0..1).
- Provide a conservative price range: priceRangeLow, priceRangeHigh.
- Provide maxBuyPrice: the highest price you'd pay to target at least ~$40 profit after 13% fees + $12 shipping.
- Provide demandLabel (Low/Medium/High) and demandScore (1..5).
- Provide sellTimeLabel and sellTimeDaysMin/Max.
- Set ignore=true if the listing is clearly not real / troll / wrong item.

Assumptions:
- Fees = 13% of sale price
- Shipping = $12
- If title is vague (e.g. "Jordan shoes"), be conservative and reduce confidence.

Return ONLY this JSON shape:
{
  "items": [
    {
      "id": "same id",
      "trueMarketPrice": 140,
      "priceRangeLow": 120,
      "priceRangeHigh": 160,
      "maxBuyPrice": 75,
      "confidence": 0.7,
      "demandLabel": "Medium",
      "demandScore": 3,
      "sellTimeLabel": "3-7 days",
      "sellTimeDaysMin": 3,
      "sellTimeDaysMax": 7,
      "ignore": false
    }
  ]
}

NO extra keys. NO commentary. NO markdown.

Input:
${JSON.stringify(compact)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON. No prose. No markdown. No trailing commas. Keep strings properly escaped.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1600,
      temperature: 0, // ✅ more stable JSON
    });

    const content = completion.choices[0]?.message?.content ?? '{"items": []}';

    const parsedObj = safeParseJsonObject<AiPricingEnvelope>(content);
    if (!parsedObj) {
      console.error("❌ Failed to parse AI pricing JSON. Raw:", content);
      return {};
    }

    const arr = Array.isArray(parsedObj.items) ? parsedObj.items : [];
    const map: Record<string, AiPricingResult> = {};

    for (const row of arr) {
      if (!row?.id) continue;
      map[row.id] = {
        id: row.id,
        trueMarketPrice: typeof row.trueMarketPrice === "number" ? row.trueMarketPrice : null,
        priceRangeLow: typeof row.priceRangeLow === "number" ? row.priceRangeLow : null,
        priceRangeHigh: typeof row.priceRangeHigh === "number" ? row.priceRangeHigh : null,
        maxBuyPrice: typeof row.maxBuyPrice === "number" ? row.maxBuyPrice : null,
        confidence: typeof row.confidence === "number" ? row.confidence : null,
        demandLabel: row.demandLabel ?? null,
        demandScore: typeof row.demandScore === "number" ? row.demandScore : null,
        sellTimeLabel: row.sellTimeLabel ?? null,
        sellTimeDaysMin: typeof row.sellTimeDaysMin === "number" ? row.sellTimeDaysMin : null,
        sellTimeDaysMax: typeof row.sellTimeDaysMax === "number" ? row.sellTimeDaysMax : null,
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

type AiAuthenticityEnvelope = { items?: AiAuthenticityResult[] };

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
    }));

    const prompt = `
Return ONLY valid JSON.

You are an authenticity + scam risk engine for flips.
Flag obvious fakes, scam pricing, and suspicious listings.

Return ONLY:
{
  "items": [
    {
      "id": "fb-123",
      "isLikelyAuthentic": true,
      "riskLevel": "low",
      "warnings": [],
      "explanation": "Normal pricing and branding.",
      "blockFromResults": false
    }
  ]
}

NO extra keys. NO text. NO markdown.

Input:
${JSON.stringify(compact)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON. No prose. No markdown. No trailing commas. Keep strings properly escaped.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0, // ✅ more stable JSON
    });

    const content = completion.choices[0]?.message?.content ?? '{"items": []}';

    const parsedObj = safeParseJsonObject<AiAuthenticityEnvelope>(content);
    if (!parsedObj) {
      console.error("❌ Failed to parse AI authenticity JSON. Raw:", content);
      return {};
    }

    const arr = Array.isArray(parsedObj.items) ? parsedObj.items : [];
    const map: Record<string, AiAuthenticityResult> = {};

    for (const row of arr) {
      if (!row?.id) continue;
      map[row.id] = {
        id: row.id,
        isLikelyAuthentic: typeof row.isLikelyAuthentic === "boolean" ? row.isLikelyAuthentic : null,
        riskLevel: row.riskLevel ?? null,
        warnings: Array.isArray(row.warnings) ? row.warnings : null,
        explanation: row.explanation ?? null,
        blockFromResults: typeof row.blockFromResults === "boolean" ? row.blockFromResults : null,
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
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
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

    console.log("📦 Listings count (pre-AI):", listings.length);

    // Internal stats first (NO Google averages any more)
    const { listings: withInternalStats, stats } = addStatsAndDiscounts(listings);

    console.log("🔍 After internal stats, listings count:", withInternalStats.length);

    // 🧹 Basic pre-AI sanity filter
    const prelimFilteredListings = withInternalStats.filter((l) => {
      const price = l.price;
      if (price == null || price <= 0) return false;

      const avg = l.productMarketStats?.average ?? null;
      if (avg == null || avg <= 0) return true;

      const ratio = price / avg;
      return ratio >= OUTLIER_MIN_RATIO && ratio <= OUTLIER_MAX_RATIO;
    });

    console.log("🧹 After basic price filter (pre-AI), listings count:", prelimFilteredListings.length);

    if (prelimFilteredListings.length === 0) {
      const filteredStatsEmpty: SearchResponse["priceStats"] = {
        ...stats,
        overall: computePriceStats([]),
      };

      return NextResponse.json(
        {
          listings: [],
          issues: issues.length ? issues : undefined,
          priceStats: filteredStatsEmpty,
        } as SearchResponse,
        { status: 200 }
      );
    }

    // 🤖 AI authenticity + pricing (per listing)
    const authenticityMap = await getAiAuthenticityJudgments(prelimFilteredListings);
    const aiMap = await getAiPricingAndDemand(prelimFilteredListings);

    // Merge AI data
    const listingsWithAi = prelimFilteredListings.map((l) => {
      const ai = aiMap[l.id];
      const auth = authenticityMap[l.id];

      const price = l.price ?? 0;
      const baseFees = l.estimatedFees != null ? l.estimatedFees : price * PLATFORM_FEE_RATE;
      const baseShipping = l.estimatedShipping != null ? l.estimatedShipping : SHIPPING_ESTIMATE;

      let aiProfit: number | null = null;
      let aiRoi: number | null = null;

      // ✅ Use AI trueMarketPrice when available
      const trueValue = ai?.trueMarketPrice ?? null;

      if (trueValue != null && price > 0) {
        const profit = trueValue - price - baseFees - baseShipping;
        const roi = (profit / price) * 100;
        aiProfit = profit;
        aiRoi = roi;
      }

      // Keep internal market stats separate (do NOT overwrite them with AI)
      const internalAvg = l.productMarketStats?.average ?? null;

      const discountPct =
        trueValue != null && price > 0
          ? ((trueValue - price) / trueValue) * 100
          : l.discountPctVsProductMedian ?? l.discountPctVsMedian ?? null;

      return {
        ...l,
        estimatedFees: baseFees,
        estimatedShipping: baseShipping,

        // Profit/ROI should be AI-driven when available
        estimatedProfit: aiProfit != null ? aiProfit : l.estimatedProfit ?? null,
        profitMarginPct: aiRoi != null ? aiRoi : l.profitMarginPct ?? null,

        // Internal stats remain internal
        productMarketStats: l.productMarketStats ?? null,
        discountPctVsProductMedian: discountPct,
        discountPctVsMedian: discountPct,

        // AI outputs
        aiTrueValue: trueValue,
        aiEstimatedValue: trueValue ?? internalAvg, // UI shows AI when possible, else internal avg
        aiConfidence: ai?.confidence ?? null,
        aiDemandScore: ai?.demandScore ?? null,
        aiSellTimeDaysMin: ai?.sellTimeDaysMin ?? null,
        aiSellTimeDaysMax: ai?.sellTimeDaysMax ?? null,
        aiShouldIgnore: ai?.ignore ?? false,

        aiPriceRangeLow: ai?.priceRangeLow ?? null,
        aiPriceRangeHigh: ai?.priceRangeHigh ?? null,
        aiMaxBuyPrice: ai?.maxBuyPrice ?? null,

        demandLabel: ai?.demandLabel ?? l.demandLabel ?? null,
        estimatedSellTime: ai?.sellTimeLabel ?? l.estimatedSellTime ?? null,

        // Authenticity
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
    // - drop <=0 ROI based on AI true value (or internal fallback)
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

    // Use AI-estimated values for the overall stats (fallback to internal avg then price)
    const overallEstimates: number[] = filteredListings
      .map((l) => {
        const v = l.aiEstimatedValue ?? l.productMarketStats?.average ?? l.price;
        return typeof v === "number" && !Number.isNaN(v) ? v : null;
      })
      .filter((v): v is number => v !== null);

    const filteredOverall = computePriceStats(overallEstimates);

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
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
