export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN!;
const FB_TASK_ID = process.env.APIFY_FB_TASK_ID!;
const EBAY_TASK_ID = process.env.APIFY_EBAY_TASK_ID!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* ===================== ASSUMPTIONS ===================== */
const PLATFORM_FEE_RATE = 0.13;
const SHIPPING_ESTIMATE = 12;

const FB_COUNT = 1000;
const EBAY_COUNT = 1000;

const MAX_AI_LISTINGS = 500;
const AI_BATCH_SIZE = 25;

const MIN_ROI_PCT = 12;
const MIN_CONFIDENCE = 0.45;

/* ===================== TYPES ===================== */
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
  source: string;
  imageUrl?: string | null;
  location?: string | null;

  estimatedFees?: number | null;
  estimatedShipping?: number | null;
  estimatedProfit?: number | null;
  profitMarginPct?: number | null;

  aiCategory?: string | null;
  aiBrand?: string | null;
  aiModel?: string | null;
  aiVariant?: string | null;
  aiSize?: string | null;
  aiGender?: string | null;
  aiCondition?: string | null;
  aiHasBox?: boolean | null;
  aiKey?: string | null;
  aiNotes?: string | null;

  aiEstimatedValue?: number | null;
  aiPriceRangeLow?: number | null;
  aiPriceRangeHigh?: number | null;
  aiConfidence?: number | null;

  aiMaxBuyPrice?: number | null;
  aiDemandLabel?: "Low" | "Medium" | "High" | null;
  aiDemandScore?: number | null;
  aiSellTimeLabel?: string | null;
  aiSellTimeDaysMin?: number | null;
  aiSellTimeDaysMax?: number | null;

  aiIgnore?: boolean | null;
  aiRiskLevel?: "low" | "medium" | "high" | null;
  aiBlockFromResults?: boolean | null;
  aiWarnings?: string[] | null;
  aiExplanation?: string | null;

  raw?: any;
};

export type SearchResponse = {
  listings: AnalyzedOffer[];
  analyzedCount?: number;
  dealsCount?: number;
  issues?: string[];
  priceStats?: {
    overall: PriceStats;
    bySource: Record<string, PriceStats>;
    byProduct: Record<string, PriceStats>;
  };
};

/* ===================== UTILS ===================== */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function safeParseAny(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {}
    }
  }
  return null;
}

function extractItemsArray(parsed: any): any[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;

  const items = parsed.items ?? parsed.results ?? null;

  if (Array.isArray(items)) return items;

  if (items && typeof items === "object" && !Array.isArray(items)) {
    return Object.values(items);
  }

  return [];
}

function computePriceStats(values: number[]): PriceStats {
  if (!values.length) return { median: null, average: null, min: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { min: sorted[0], max: sorted[sorted.length - 1], average: sum / sorted.length, median };
}

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function pickImage(item: any): string | null {
  return (
    item?.primary_listing_photo?.listing_image?.uri ||
    item?.primary_listing_photo?.image?.uri ||
    (Array.isArray(item?.listing_photos) && item?.listing_photos?.[0]?.image?.uri) ||
    item?.image ||
    item?.imageUrl ||
    item?.thumbnail ||
    null
  );
}

function asNumber(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/* ===================== APIFY INGEST ===================== */
function pickFacebookPrice(item: any): number | null {
  const candidates = [
    item?.listing_price?.amount,
    item?.price?.amount,
    item?.price_amount,
    item?.price,
    item?.formatted_price?.text,
    item?.listingPrice,
  ];

  for (const c of candidates) {
    if (c == null) continue;

    if (typeof c === "number" && Number.isFinite(c)) return c;

    if (typeof c === "string") {
      const n = Number(c.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n)) return n;
    }

    if (typeof c === "object" && c?.amount != null) {
      const n = Number(c.amount);
      if (Number.isFinite(n)) return n;
    }
  }

  return null;
}

function mapFacebookItem(item: any): AnalyzedOffer {
  const idRaw = item?.id ?? item?.listing_id ?? item?.marketplace_listing_id;

  const price = pickFacebookPrice(item);

  const id = idRaw ? `fb-${String(idRaw)}` : `fb-${Math.random()}`;

  const title =
    item?.custom_title ||
    item?.marketplace_listing_title ||
    item?.title ||
    "Untitled";

  const url =
    idRaw != null
      ? `https://www.facebook.com/marketplace/item/${idRaw}/`
      : (item?.story?.url ?? "");

  return {
    id,
    title,
    price,
    currency: "USD",
    url,
    source: "Facebook Marketplace",
    imageUrl: pickImage(item),
    location: item?.location_text?.text ?? item?.location?.reverse_geocode?.city ?? null,
    raw: item,
  };
}

async function scrapeFacebook(query: string): Promise<AnalyzedOffer[]> {
  if (!APIFY_API_TOKEN || !FB_TASK_ID) return [];

  const runRes = await fetch(
    `https://api.apify.com/v2/actor-tasks/${FB_TASK_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=180`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [`https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}`],
        deepScrape: false,
        maxItems: FB_COUNT,
        maxItemsPerStartUrl: FB_COUNT,
        proxy: { useApifyProxy: true, countryCode: "US" },
      }),
    }
  );

  if (!runRes.ok) return [];
  const runJson = await runRes.json();
  const run = runJson?.data;
  if (!run || run.status !== "SUCCEEDED") return [];

  const datasetId = run.defaultDatasetId || run.output?.defaultDatasetId;
  if (!datasetId) return [];

  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&token=${APIFY_API_TOKEN}&limit=${FB_COUNT}`
  );
  if (!datasetRes.ok) return [];

  const items: any[] = await datasetRes.json();
  return items.map(mapFacebookItem);
}

function mapEbayItem(item: any): AnalyzedOffer {
  const price =
    asNumber(item?.price?.amount) ??
    asNumber(item?.currentPrice?.value) ??
    asNumber(item?.sellingStatus?.currentPrice?.value) ??
    (typeof item?.price === "string" ? asNumber(item.price.replace(/[^0-9.]/g, "")) : null);

  const baseId = item?.id || item?.itemId || item?.listingId || item?.url || item?.viewItemURL;
  const id = `eb-${String(baseId ?? Math.random())}`;

  return {
    id,
    title: item?.title || "Untitled",
    price,
    currency: "USD",
    url: item?.viewItemURL || item?.url || item?.detailPageURL || "",
    source: "eBay",
    imageUrl: pickImage(item),
    location: item?.location || item?.sellerLocation || null,
    raw: item,
  };
}

async function scrapeEbay(query: string): Promise<AnalyzedOffer[]> {
  if (!APIFY_API_TOKEN || !EBAY_TASK_ID) return [];

  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;

  const runRes = await fetch(
    `https://api.apify.com/v2/actor-tasks/${EBAY_TASK_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=180`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        count: EBAY_COUNT,
        deepScrape: false,
        proxy: { useApifyProxy: true, countryCode: "US" },
        startUrls: [{ url: ebayUrl }],
      }),
    }
  );

  if (!runRes.ok) return [];
  const runJson = await runRes.json();
  const run = runJson?.data;
  if (!run || run.status !== "SUCCEEDED") return [];

  const datasetId = run.defaultDatasetId || run.output?.defaultDatasetId;
  if (!datasetId) return [];

  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&token=${APIFY_API_TOKEN}&limit=${EBAY_COUNT}`
  );
  if (!datasetRes.ok) return [];

  const items: any[] = await datasetRes.json();
  return items.map(mapEbayItem);
}

/* ===================== AI ENRICH ===================== */
type AiRow = {
  id: string;

  category?: string | null;
  brand?: string | null;
  model?: string | null;
  variant?: string | null;
  size?: string | null;
  gender?: string | null;
  condition?: string | null;
  hasBox?: boolean | null;
  key?: string | null;
  notes?: string | null;

  trueMarketPrice?: number | null;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  confidence?: number | null;

  maxBuyPrice?: number | null;

  demandLabel?: "Low" | "Medium" | "High" | null;
  demandScore?: number | null;
  sellTimeLabel?: string | null;
  sellTimeDaysMin?: number | null;
  sellTimeDaysMax?: number | null;

  ignore?: boolean | null;
  riskLevel?: "low" | "medium" | "high" | null;
  blockFromResults?: boolean | null;
  warnings?: string[] | null;
  explanation?: string | null;

  // allow alt id fields in case model returns them
  listingId?: any;
  listing_id?: any;
  originalId?: any;
};

function coerceStringId(x: any): string | null {
  if (x == null) return null;
  if (typeof x === "string") return x.trim();
  if (typeof x === "number" && Number.isFinite(x)) return String(x);
  return null;
}

async function aiEnrich(listings: AnalyzedOffer[]): Promise<Record<string, AiRow>> {
  if (!OPENAI_API_KEY || listings.length === 0) return {};

  const batches = chunk(listings, AI_BATCH_SIZE);
  const out: Record<string, AiRow> = {};

  for (const batch of batches) {
    const compact = batch.map((l) => ({
      id: l.id, // MUST echo back exactly
      title: l.title,
      price: l.price,
      source: l.source,
      location: l.location ?? null,
      url: l.url,
      imageUrl: l.imageUrl ?? null,
    }));

    const prompt = `
Return ONLY valid JSON with EXACT shape:
{"items":[{...},{...}]}

CRITICAL:
- Output one item per input listing.
- "items" MUST be an array.
- The field "id" MUST be copied EXACTLY from input "id". Do not change it.

For each listing:
- Extract category/brand/model/variant/size/condition conservatively.
- Estimate trueMarketPrice (sell price).
- priceRangeLow/high.
- confidence (0..1).
- maxBuyPrice:
  If trueMarketPrice < 80 -> target profit >= $10 after 13% fees + $12 ship
  Else -> target profit >= $25 after 13% fees + $12 ship
- Flag scams: ignore/blockFromResults, set riskLevel.
- key must be "<category>|<brand>|<model>|<variant>|<size>|<condition>"

Input:
${JSON.stringify(compact)}
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return ONLY JSON. Must include items array. Each item must include id copied EXACTLY from input.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 2400,
    });

    const raw = res.choices[0]?.message?.content ?? "";
    const parsed = safeParseAny(raw);
    const items = extractItemsArray(parsed);

    if (!Array.isArray(items) || items.length === 0) {
      console.error("❌ AI returned no iterable items. Snippet:", raw.slice(0, 400));
      continue;
    }

    const expected = new Set(batch.map((b) => b.id));
    let matched = 0;

    for (const row of items) {
      if (!row) continue;

      // accept multiple id field names
      const rid =
        coerceStringId(row.id) ??
        coerceStringId(row.listingId) ??
        coerceStringId(row.listing_id) ??
        coerceStringId(row.originalId);

      if (!rid) continue;

      // exact match
      if (expected.has(rid)) {
        out[rid] = row as AiRow;
        matched++;
        continue;
      }

      // numeric -> try fb-/eb- prefixes
      const fbGuess = `fb-${rid}`;
      const ebGuess = `eb-${rid}`;

      if (expected.has(fbGuess)) {
        out[fbGuess] = { ...(row as AiRow), id: fbGuess };
        matched++;
        continue;
      }
      if (expected.has(ebGuess)) {
        out[ebGuess] = { ...(row as AiRow), id: ebGuess };
        matched++;
        continue;
      }
    }

    console.log(`🤖 AI batch: input=${batch.length} output=${items.length} matched=${matched}`);

    if (matched === 0) {
      console.error("❌ AI matched=0. Sample expected:", batch[0]?.id);
      console.error(
        "❌ AI matched=0. Sample row:",
        JSON.stringify(items[0] ?? {}, null, 2).slice(0, 700)
      );
    }
  }

  return out;
}

/* ===================== CANDIDATE SELECTION ===================== */
function selectCandidates(listings: AnalyzedOffer[], maxN: number): AnalyzedOffer[] {
  const priced = listings.filter((l) => (l.price ?? 0) > 0);
  if (priced.length <= maxN) return priced;

  const prices = priced.map((l) => l.price as number).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];

  const score = (p: number) => {
    if (!median || median <= 0) return 0;
    const disc = (median - p) / median;
    return Math.max(0, Math.min(0.85, disc));
  };

  const scored = priced
    .map((l) => ({ l, s: score(l.price as number) }))
    .sort((a, b) => b.s - a.s);

  const topUndervalued = scored.slice(0, Math.floor(maxN * 0.6)).map((x) => x.l);
  const cheapest = [...priced]
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    .slice(0, Math.floor(maxN * 0.25));

  const remaining = priced.filter((l) => !topUndervalued.includes(l) && !cheapest.includes(l));
  const random = [...remaining].sort(() => Math.random() - 0.5).slice(0, maxN - topUndervalued.length - cheapest.length);

  const combined = [...topUndervalued, ...cheapest, ...random];

  const seen = new Set<string>();
  return combined.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
}

/* ===================== ROUTE ===================== */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body.query || "").trim();
    const site = String(body.site || "any");

    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    const issues: string[] = [];
    let listings: AnalyzedOffer[] = [];

    if (site === "facebook" || site === "any") listings = listings.concat(await scrapeFacebook(query));
    if (site === "ebay" || site === "any") listings = listings.concat(await scrapeEbay(query));

    listings = listings.filter((l) => (l.price ?? 0) > 0);

    // dedupe
    const m = new Map<string, AnalyzedOffer>();
    for (const l of listings) if (!m.has(l.id)) m.set(l.id, l);
    listings = Array.from(m.values());

    const fbCount = listings.filter((l) => l.source === "Facebook Marketplace").length;
    const ebCount = listings.filter((l) => l.source === "eBay").length;
    console.log("📦 Ingest breakdown — FB:", fbCount, "eBay:", ebCount, "total:", listings.length);

    if (!listings.length) {
      return NextResponse.json(
        {
          listings: [],
          issues: ["No listings found."],
          priceStats: { overall: computePriceStats([]), bySource: {}, byProduct: {} },
        } as SearchResponse,
        { status: 200 }
      );
    }

    const candidates = selectCandidates(listings, MAX_AI_LISTINGS);

    if (listings.length > candidates.length) {
      issues.push(`Analyzed ${candidates.length}/${listings.length} listings for speed/cost.`);
    }

    const aiMap = await aiEnrich(candidates);

    const analyzed: AnalyzedOffer[] = candidates
      .map((l) => {
        const ai = aiMap[l.id];
        if (!ai) return null;

        const price = l.price ?? 0;
        const fees = price * PLATFORM_FEE_RATE;
        const ship = SHIPPING_ESTIMATE;

        const trueValue =
          typeof ai.trueMarketPrice === "number" && Number.isFinite(ai.trueMarketPrice)
            ? ai.trueMarketPrice
            : null;

        if (trueValue == null) return null;

        const profit = trueValue - price - fees - ship;
        const roi = price > 0 ? (profit / price) * 100 : null;

        return {
          ...l,
          estimatedFees: fees,
          estimatedShipping: ship,
          estimatedProfit: profit,
          profitMarginPct: roi,

          aiCategory: ai.category ?? null,
          aiBrand: ai.brand ?? null,
          aiModel: ai.model ?? null,
          aiVariant: ai.variant ?? null,
          aiSize: ai.size ?? null,
          aiGender: ai.gender ?? null,
          aiCondition: ai.condition ?? null,
          aiHasBox: typeof ai.hasBox === "boolean" ? ai.hasBox : null,
          aiKey: ai.key ? normalizeKey(ai.key) : null,
          aiNotes: ai.notes ?? null,

          aiEstimatedValue: trueValue,
          aiPriceRangeLow: typeof ai.priceRangeLow === "number" ? ai.priceRangeLow : null,
          aiPriceRangeHigh: typeof ai.priceRangeHigh === "number" ? ai.priceRangeHigh : null,
          aiConfidence: typeof ai.confidence === "number" ? ai.confidence : null,

          aiMaxBuyPrice: typeof ai.maxBuyPrice === "number" ? ai.maxBuyPrice : null,
          aiDemandLabel: (ai as any).demandLabel ?? null,
          aiDemandScore: typeof (ai as any).demandScore === "number" ? (ai as any).demandScore : null,
          aiSellTimeLabel: (ai as any).sellTimeLabel ?? null,
          aiSellTimeDaysMin: typeof (ai as any).sellTimeDaysMin === "number" ? (ai as any).sellTimeDaysMin : null,
          aiSellTimeDaysMax: typeof (ai as any).sellTimeDaysMax === "number" ? (ai as any).sellTimeDaysMax : null,

          aiIgnore: !!(ai as any).ignore,
          aiRiskLevel: (ai as any).riskLevel ?? null,
          aiBlockFromResults: !!(ai as any).blockFromResults,
          aiWarnings: Array.isArray((ai as any).warnings) ? (ai as any).warnings : null,
          aiExplanation: (ai as any).explanation ?? null,
        };
      })
      .filter(Boolean) as AnalyzedOffer[];

    const deals = analyzed
      .filter((l) => {
        if (l.aiBlockFromResults) return false;
        if (l.aiRiskLevel === "high") return false;
        if (l.aiIgnore) return false;
        if ((l.aiConfidence ?? 0) < MIN_CONFIDENCE) return false;

        const tv = l.aiEstimatedValue ?? 0;
        const minProfit = tv < 80 ? 10 : 25;

        if (l.estimatedProfit == null || l.estimatedProfit < minProfit) return false;
        if (l.profitMarginPct == null || l.profitMarginPct < MIN_ROI_PCT) return false;

        if (typeof l.aiMaxBuyPrice === "number" && l.price != null) {
          const slack = (l.aiConfidence ?? 0) >= 0.7 ? 0 : 10;
          if (l.price > l.aiMaxBuyPrice + slack) return false;
        }
        return true;
      })
      .sort((a, b) => (b.profitMarginPct ?? 0) - (a.profitMarginPct ?? 0));

    const listingsToReturn =
      deals.length > 0
        ? deals
        : analyzed
            .sort((a, b) => (b.profitMarginPct ?? -999) - (a.profitMarginPct ?? -999))
            .slice(0, 50);

    const vals = listingsToReturn
      .map((l) => l.aiEstimatedValue)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const res: SearchResponse = {
      listings: listingsToReturn,
      analyzedCount: analyzed.length,
      dealsCount: deals.length,
      issues: issues.length ? issues : undefined,
      priceStats: {
        overall: computePriceStats(vals),
        bySource: {},
        byProduct: {},
      },
    };

    console.log("📦 Ingested:", listings.length, "AI analyzed:", analyzed.length, "Deals:", deals.length);
    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error in search route:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
