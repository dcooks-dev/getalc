/**
 * GetAlc — Datafeedr product matching script
 *
 * Finds real bottle images, direct purchase URLs, and prices for each
 * wine and beer in the database.
 *
 * Prerequisites:
 *   Run supabase/migrations/001_datafeedr_columns.sql in Supabase SQL Editor.
 *
 * Usage:
 *   npx tsx scripts/datafeedr-match.ts           # wines + beers
 *   npx tsx scripts/datafeedr-match.ts --wines   # wines only
 *   npx tsx scripts/datafeedr-match.ts --beers   # beers only
 *   npx tsx scripts/datafeedr-match.ts --dry-run # find matches, log only
 *   npx tsx scripts/datafeedr-match.ts --force   # re-process already-matched
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

(globalThis as any).WebSocket = ws;

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const API_ID       = process.env.DATAFEEDR_API_ID!;
const API_KEY      = process.env.DATAFEEDR_API_KEY!;

const DRY_RUN    = process.argv.includes('--dry-run');
const WINES_ONLY = process.argv.includes('--wines');
const BEERS_ONLY = process.argv.includes('--beers');
const FORCE      = process.argv.includes('--force');

const SEARCH_LIMIT   = 20;
const BATCH_SIZE     = 10;
const BATCH_DELAY_MS = 1000;
const CALL_DELAY_MS  = 600;

const ACCEPT_SCORE = 70;
const REVIEW_SCORE = 40;

// Price sanity bounds in cents (smallest currency unit)
const MIN_PRICE_CENTS = 300;    // $3
const MAX_PRICE_CENTS = 500000; // $5000

const LOG_PATH = path.join(process.cwd(), 'scripts', 'matching_log.json');

// ── Validation ────────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}
if (!API_ID || !API_KEY) {
  console.error('Missing DATAFEEDR_API_ID or DATAFEEDR_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────

interface DatafeedrProduct {
  _id:          string | number;
  name:         string;
  price:        number; // original price in cents
  finalprice:   number; // final price in cents (after discount)
  currency:     string;
  url:          string;  // affiliate tracking URL — contains @@@, do not use directly
  direct_url?:  string;  // real product page URL (no affiliate code)
  image?:       string;
  description?: string;
  category?:    string;
  brand?:       string;
  merchant:     string;  // plain merchant name string
}

interface DatafeedrResponse {
  products?:    DatafeedrProduct[];
  found_count?: number;
  length?:      number;
  error?:       string;
  status?: {
    request_count: number;
    max_requests:  number;
    product_count: number;
    plan_id:       number;
  };
  version?: string;
  time?:    number;
}

interface WineRow {
  id:           number;
  display_name: string;
  producer:     string;
  color:        string;
  vintage:      number | null;
  grapes:       string[] | null;
  region:       string | null;
  country:      string | null;
}

interface BeerRow {
  id:       number;
  name:     string;
  brewery:  string;
  style:    string;
  country:  string | null;
  region:   string | null;
}

interface LogEntry {
  product_id:             number | string;
  product_name:           string;
  product_type:           'wine' | 'beer';
  match_found:            boolean;
  confidence_score:       number;
  datafeedr_id:           string | null;
  datafeedr_product_name: string | null;
  reason:                 string;
}

interface Summary {
  total:           number;
  matched:         number;
  needs_review:    number;
  rejected:        number;
  already_matched: number;
  skipped:         number;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const STOPWORDS = new Set([
  'wine', 'beer', 'red', 'white', 'the', 'a', 'an', 'craft', 'premium',
  'special', 'edition', 'limited', 'de', 'du', 'la', 'le', 'les',
  'di', 'del', 'dei', 'il', 'of', 'and', 'by', 'from', 'in', 'at',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function candidateText(p: DatafeedrProduct): string {
  return [p.name, p.description ?? '', p.brand ?? '', p.category ?? ''].join(' ').toLowerCase();
}

function merchantName(p: DatafeedrProduct): string {
  return p.merchant ?? '';
}

// ── Alcohol verification (Step 2) ──────────────────────────────────────────────

const NON_ALCOHOL_TERMS = [
  'perfume', 'cologne', 'fragrance', 'eau de toilette', 'deodorant', 'parfum',
  'clothing', 'apparel', 'shirt', 'pants', 'shoes', 'jacket', 'dress',
  'book', 'novel', 'textbook', 'magazine',
  'poster', 'print', 'artwork', 'canvas',
  'toy', 'game', 'puzzle',
  'wine opener', 'bottle opener', 'corkscrew',
  'wine glass', 'beer glass', 'stemware', 'glassware',
  'gift set', 'accessory kit',
  'vinegar', 'sauce', 'condiment',
  'candle', 'wax melt',
  'supplement', 'vitamin', 'capsule', 'pill', 'protein',
  'electronics', 'software',
];

const ALCOHOL_TERMS = [
  'wine', 'beer', 'spirits', 'whisky', 'whiskey', 'gin', 'rum', 'vodka',
  'tequila', 'bourbon', 'scotch', 'champagne', 'prosecco', 'cava', 'sparkling',
  'brandy', 'cognac', 'cider', 'mead', 'sake', 'port', 'sherry', 'vermouth',
  'liqueur', 'ale', 'lager', 'stout', 'porter', 'ipa', 'pilsner', 'pale ale',
  'alcohol', 'beverage', 'winery', 'brewery', 'distillery', 'vintage', 'chateau',
  'domaine', 'bottled', 'bottle', 'cl', 'abv', 'alc',
];

function isAlcohol(p: DatafeedrProduct): boolean {
  const text = candidateText(p);
  for (const term of NON_ALCOHOL_TERMS) {
    if (text.includes(term)) return false;
  }
  for (const term of ALCOHOL_TERMS) {
    if (text.includes(term)) return true;
  }
  // Borderline — allow through; scoring will penalise if truly wrong
  return true;
}

function isPriceRealistic(p: DatafeedrProduct): boolean {
  const price = p.finalprice || p.price;
  return price >= MIN_PRICE_CENTS && price <= MAX_PRICE_CENTS;
}

// ── Scoring (Step 3) ──────────────────────────────────────────────────────────

function scoreWine(candidate: DatafeedrProduct, wine: WineRow): number {
  let score = 0;
  const text = candidateText(candidate);

  // +35: name match (fuzzy, stopwords removed)
  const jaccard = jaccardSimilarity(tokenize(wine.display_name), tokenize(candidate.name));
  if (jaccard >= 0.5)       score += 35;
  else if (jaccard >= 0.25) score += 17;

  // +20: producer match
  const prodJaccard = jaccardSimilarity(tokenize(wine.producer), tokenize(candidate.name));
  if (prodJaccard >= 0.4 || (wine.producer && text.includes(wine.producer.toLowerCase()))) score += 20;
  else if (prodJaccard >= 0.2) score += 10;

  // +15: vintage year
  if (wine.vintage && candidate.name.includes(String(wine.vintage))) score += 15;

  // +10: grape variety
  if (wine.grapes?.some(g => text.includes(g.toLowerCase()))) score += 10;

  // +10: region or country
  if (wine.region && text.includes(wine.region.toLowerCase()))   score += 10;
  else if (wine.country && text.includes(wine.country.toLowerCase())) score += 10;

  // +10: wine colour
  const COLOR_TERMS: Record<string, string[]> = {
    red:        ['red wine', 'rouge', 'rosso', 'tinto'],
    white:      ['white wine', 'blanc', 'bianco', 'blanco'],
    rose:       ['rosé', 'rose wine', 'rosato', 'rosado'],
    sparkling:  ['sparkling', 'champagne', 'prosecco', 'cava', 'crémant', 'cremant'],
    dessert:    ['dessert', 'sweet wine', 'late harvest', 'auslese', 'sauternes'],
    fortified:  ['port', 'porto', 'sherry', 'madeira', 'fortified'],
  };
  if ((COLOR_TERMS[wine.color] ?? []).some(t => text.includes(t))) score += 10;

  // +5: price realistic for wine ($15–$2000)
  const priceCents = candidate.finalprice || candidate.price;
  if (priceCents >= 1500 && priceCents <= 200000) score += 5;

  // -25: grape contradiction — candidate product name contains a grape from the wrong colour
  // (e.g. Malbec listing matches a Chardonnay product because they share a vineyard name)
  const candidateNameLower = candidate.name.toLowerCase();
  const WHITE_GRAPE_TERMS = [
    'chardonnay', 'sauvignon blanc', 'riesling', 'pinot grigio', 'pinot gris',
    'gewurztraminer', 'viognier', 'gruner veltliner', 'grüner veltliner',
    'muscat', 'chenin blanc', 'semillon', 'albariño', 'albarino', 'torrontes',
    'trebbiano', 'grenache blanc', 'roussanne', 'marsanne', 'vermentino',
  ];
  const RED_GRAPE_TERMS = [
    'malbec', 'cabernet sauvignon', 'cabernet franc', 'merlot', 'pinot noir',
    'syrah', 'shiraz', 'nebbiolo', 'sangiovese', 'tempranillo', 'grenache',
    'garnacha', 'barbera', 'zinfandel', 'carmenere', 'mourvedre',
    'touriga nacional', 'primitivo', 'aglianico',
  ];
  const isRedWine   = ['red', 'fortified'].includes(wine.color);
  const isWhiteWine = ['white', 'dessert'].includes(wine.color);
  if (isRedWine   && WHITE_GRAPE_TERMS.some(g => candidateNameLower.includes(g))) score -= 25;
  if (isWhiteWine && RED_GRAPE_TERMS.some(g => candidateNameLower.includes(g)))   score -= 25;

  // -40: non-alcohol penalty (safety net — should already be filtered)
  if (!isAlcohol(candidate)) score -= 40;

  return Math.max(0, Math.min(100, score));
}

function scoreBeer(candidate: DatafeedrProduct, beer: BeerRow): number {
  let score = 0;
  const text = candidateText(candidate);

  // +35: name match
  const jaccard = jaccardSimilarity(tokenize(beer.name), tokenize(candidate.name));
  if (jaccard >= 0.5)       score += 35;
  else if (jaccard >= 0.25) score += 17;

  // +20: brewery match
  const brewJaccard = jaccardSimilarity(tokenize(beer.brewery), tokenize(candidate.name));
  if (brewJaccard >= 0.4 || (beer.brewery && text.includes(beer.brewery.toLowerCase()))) score += 20;
  else if (brewJaccard >= 0.2) score += 10;

  // +10: beer style
  if (beer.style && text.includes(beer.style.toLowerCase())) score += 10;

  // +10: country or region
  if (beer.region && text.includes(beer.region.toLowerCase()))     score += 10;
  else if (beer.country && text.includes(beer.country.toLowerCase())) score += 10;

  // +10: beer type keyword that aligns with this beer's style
  const BEER_TYPES = ['ale', 'lager', 'stout', 'porter', 'ipa', 'pilsner', 'wheat', 'saison', 'sour', 'pale ale'];
  const styleStr = beer.style.toLowerCase();
  if (BEER_TYPES.some(t => text.includes(t) && styleStr.includes(t))) score += 10;

  // +5: price realistic for beer ($5–$150)
  const priceCents = candidate.finalprice || candidate.price;
  if (priceCents >= 500 && priceCents <= 15000) score += 5;

  // -40: non-alcohol penalty
  if (!isAlcohol(candidate)) score -= 40;

  return Math.max(0, Math.min(100, score));
}

// ── Datafeedr API ─────────────────────────────────────────────────────────────

async function checkStatus(): Promise<void> {
  try {
    const res = await fetch('https://api.datafeedr.com/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aid: API_ID, akey: API_KEY }),
    });
    const json: DatafeedrResponse = await res.json();
    if (json.error) { console.warn(`[status] API error: ${json.error}`); return; }
    const s = json.status;
    if (s) console.log(`[status] Requests: ${s.request_count} used / ${s.max_requests} max | Products indexed: ${s.product_count?.toLocaleString()} | Plan: ${s.plan_id}`);
  } catch (err) {
    console.warn(`[status] Could not reach status endpoint: ${(err as Error).message}`);
  }
}

async function searchDatafeedr(query: string): Promise<DatafeedrProduct[]> {
  const res = await fetch('https://api.datafeedr.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aid: API_ID,
      akey: API_KEY,
      query: [`ANY LIKE ${query}`],
      limit: SEARCH_LIMIT,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`);
  }
  const json: DatafeedrResponse = await res.json();
  if (json.error) throw new Error(`API error: ${json.error}`);
  return json.products ?? [];
}

// ── Exchange rates ────────────────────────────────────────────────────────────

async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const count = Object.keys(data.rates ?? {}).length;
    console.log(`[rates] Fetched ${count} exchange rates (base: USD)`);
    return data.rates ?? {};
  } catch (err) {
    console.warn(`[rates] Failed: ${(err as Error).message} — prices stored as-is`);
    return {};
  }
}

// rates object: "1 USD = X currency", so 1 EUR → divide EUR amount by rates.EUR
function toUSD(cents: number, currency: string, rates: Record<string, number>): number {
  const amount = cents / 100;
  if (!currency || currency.toUpperCase() === 'USD') return amount;
  const rate = rates[currency.toUpperCase()];
  if (!rate) return amount;
  return Math.round((amount / rate) * 100) / 100;
}

// ── Migration check ───────────────────────────────────────────────────────────

async function checkMigration(): Promise<void> {
  const { error } = await supabase.from('wines').select('datafeedr_matched').limit(1);
  if (error?.message?.includes('datafeedr_matched')) {
    console.error(
      '\n[error] Migration has not been applied.\n' +
      '        Run supabase/migrations/001_datafeedr_columns.sql in the Supabase SQL Editor first.\n'
    );
    process.exit(1);
  }
}

// ── Process one product ───────────────────────────────────────────────────────

async function processWine(
  wine: WineRow,
  rates: Record<string, number>,
  logs: LogEntry[],
  summary: Summary,
): Promise<void> {
  const query = [wine.display_name, wine.producer].filter(Boolean).join(' ');
  process.stdout.write(`  [wine] "${query}" → `);

  let raw: DatafeedrProduct[] = [];
  try {
    raw = await searchDatafeedr(query);
  } catch (err) {
    process.stdout.write(`ERROR: ${(err as Error).message}\n`);
    logs.push({ product_id: wine.id, product_name: wine.display_name, product_type: 'wine', match_found: false, confidence_score: 0, datafeedr_id: null, datafeedr_product_name: null, reason: `search_error` });
    summary.skipped++;
    return;
  }

  // Step 2: alcohol verification + price filter
  const candidates = raw.filter(c => isAlcohol(c) && isPriceRealistic(c));

  if (!candidates.length) {
    process.stdout.write(`no valid candidates (${raw.length} fetched, all filtered)\n`);
    logs.push({ product_id: wine.id, product_name: wine.display_name, product_type: 'wine', match_found: false, confidence_score: 0, datafeedr_id: null, datafeedr_product_name: null, reason: `filtered_all_${raw.length}` });
    summary.rejected++;
    return;
  }

  // Step 3: score and rank
  const scored = candidates
    .map(c => ({ c, score: scoreWine(c, wine) }))
    .sort((a, b) => b.score - a.score);

  const { c: best, score } = scored[0];
  const priceCents = best.finalprice || best.price;
  const price_usd  = toUSD(priceCents, best.currency, rates);
  const product_url = best.direct_url ?? null;
  const mid = merchantName(best);

  const updatePayload: Record<string, unknown> = {
    product_url,
    price:              price_usd,
    original_price:     priceCents / 100,
    original_currency:  best.currency,
    merchant_name:      mid,
    datafeedr_id:       String(best._id),
    datafeedr_matched:  score >= ACCEPT_SCORE,
    match_confidence_score: score,
    needs_review:       score >= REVIEW_SCORE && score < ACCEPT_SCORE,
  };
  if (best.image) updatePayload.image_url = best.image;

  if (score >= ACCEPT_SCORE) {
    process.stdout.write(`MATCH (${score}) "${best.name}" @ ${mid} — ${best.currency} ${(priceCents / 100).toFixed(2)}\n`);
    logs.push({ product_id: wine.id, product_name: wine.display_name, product_type: 'wine', match_found: true, confidence_score: score, datafeedr_id: String(best._id), datafeedr_product_name: best.name, reason: `accepted` });
    if (!DRY_RUN) await supabase.from('wines').update(updatePayload).eq('id', wine.id);
    summary.matched++;
  } else if (score >= REVIEW_SCORE) {
    process.stdout.write(`REVIEW (${score}) "${best.name}" @ ${mid}\n`);
    logs.push({ product_id: wine.id, product_name: wine.display_name, product_type: 'wine', match_found: true, confidence_score: score, datafeedr_id: String(best._id), datafeedr_product_name: best.name, reason: `needs_review` });
    if (!DRY_RUN) await supabase.from('wines').update(updatePayload).eq('id', wine.id);
    summary.needs_review++;
  } else {
    process.stdout.write(`REJECT (${score}) best was "${best.name}"\n`);
    logs.push({ product_id: wine.id, product_name: wine.display_name, product_type: 'wine', match_found: false, confidence_score: score, datafeedr_id: String(best._id), datafeedr_product_name: best.name, reason: `rejected` });
    summary.rejected++;
  }
}

async function processBeer(
  beer: BeerRow,
  rates: Record<string, number>,
  logs: LogEntry[],
  summary: Summary,
): Promise<void> {
  const query = [beer.name, beer.brewery].filter(Boolean).join(' ');
  process.stdout.write(`  [beer] "${query}" → `);

  let raw: DatafeedrProduct[] = [];
  try {
    raw = await searchDatafeedr(query);
  } catch (err) {
    process.stdout.write(`ERROR: ${(err as Error).message}\n`);
    logs.push({ product_id: beer.id, product_name: beer.name, product_type: 'beer', match_found: false, confidence_score: 0, datafeedr_id: null, datafeedr_product_name: null, reason: `search_error` });
    summary.skipped++;
    return;
  }

  const candidates = raw.filter(c => isAlcohol(c) && isPriceRealistic(c));

  if (!candidates.length) {
    process.stdout.write(`no valid candidates (${raw.length} fetched, all filtered)\n`);
    logs.push({ product_id: beer.id, product_name: beer.name, product_type: 'beer', match_found: false, confidence_score: 0, datafeedr_id: null, datafeedr_product_name: null, reason: `filtered_all_${raw.length}` });
    summary.rejected++;
    return;
  }

  const scored = candidates
    .map(c => ({ c, score: scoreBeer(c, beer) }))
    .sort((a, b) => b.score - a.score);

  const { c: best, score } = scored[0];
  const priceCents = best.finalprice || best.price;
  const price_usd  = toUSD(priceCents, best.currency, rates);
  const product_url = best.direct_url ?? null;
  const mid = merchantName(best);

  const updatePayload: Record<string, unknown> = {
    product_url,
    price:              price_usd,
    original_price:     priceCents / 100,
    original_currency:  best.currency,
    merchant_name:      mid,
    datafeedr_id:       String(best._id),
    datafeedr_matched:  score >= ACCEPT_SCORE,
    match_confidence_score: score,
    needs_review:       score >= REVIEW_SCORE && score < ACCEPT_SCORE,
  };
  if (best.image) updatePayload.image_url = best.image;

  if (score >= ACCEPT_SCORE) {
    process.stdout.write(`MATCH (${score}) "${best.name}" @ ${mid} — ${best.currency} ${(priceCents / 100).toFixed(2)}\n`);
    logs.push({ product_id: beer.id, product_name: beer.name, product_type: 'beer', match_found: true, confidence_score: score, datafeedr_id: String(best._id), datafeedr_product_name: best.name, reason: `accepted` });
    if (!DRY_RUN) await supabase.from('beers').update(updatePayload).eq('id', beer.id);
    summary.matched++;
  } else if (score >= REVIEW_SCORE) {
    process.stdout.write(`REVIEW (${score}) "${best.name}" @ ${mid}\n`);
    logs.push({ product_id: beer.id, product_name: beer.name, product_type: 'beer', match_found: true, confidence_score: score, datafeedr_id: String(best._id), datafeedr_product_name: best.name, reason: `needs_review` });
    if (!DRY_RUN) await supabase.from('beers').update(updatePayload).eq('id', beer.id);
    summary.needs_review++;
  } else {
    process.stdout.write(`REJECT (${score}) best was "${best.name}"\n`);
    logs.push({ product_id: beer.id, product_name: beer.name, product_type: 'beer', match_found: false, confidence_score: score, datafeedr_id: String(best._id), datafeedr_product_name: best.name, reason: `rejected` });
    summary.rejected++;
  }
}

// ── Run wines / beers ─────────────────────────────────────────────────────────

async function matchWines(rates: Record<string, number>, logs: LogEntry[], summary: Summary): Promise<void> {
  const q = supabase
    .from('wines')
    .select('id, display_name, producer, color, vintage, grapes, region, country')
    .order('rating', { ascending: false });

  const { data: wines, error } = await (FORCE ? q : q.eq('datafeedr_matched', false));
  if (error) throw error;
  if (!wines?.length) { console.log('\n[wines] Nothing to match.'); return; }

  console.log(`\n[wines] Processing ${wines.length} products...`);

  for (let i = 0; i < wines.length; i++) {
    await processWine(wines[i] as WineRow, rates, logs, summary);
    summary.total++;
    await sleep(CALL_DELAY_MS);
    if ((i + 1) % BATCH_SIZE === 0 && i < wines.length - 1) {
      console.log(`  ↳ batch ${Math.ceil((i + 1) / BATCH_SIZE)} complete, pausing 1s...`);
      await sleep(BATCH_DELAY_MS);
    }
  }
}

async function matchBeers(rates: Record<string, number>, logs: LogEntry[], summary: Summary): Promise<void> {
  const q = supabase
    .from('beers')
    .select('id, name, brewery, style, country, region')
    .order('rating', { ascending: false });

  const { data: beers, error } = await (FORCE ? q : q.eq('datafeedr_matched', false));
  if (error) throw error;
  if (!beers?.length) { console.log('\n[beers] Nothing to match.'); return; }

  console.log(`\n[beers] Processing ${beers.length} products...`);

  for (let i = 0; i < beers.length; i++) {
    await processBeer(beers[i] as BeerRow, rates, logs, summary);
    summary.total++;
    await sleep(CALL_DELAY_MS);
    if ((i + 1) % BATCH_SIZE === 0 && i < beers.length - 1) {
      console.log(`  ↳ batch ${Math.ceil((i + 1) / BATCH_SIZE)} complete, pausing 1s...`);
      await sleep(BATCH_DELAY_MS);
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

(async () => {
  console.log('GetAlc — Datafeedr Matching');
  if (DRY_RUN) console.log('DRY RUN — no writes to Supabase');
  if (FORCE)   console.log('--force — re-processing all products');
  console.log('');

  await checkMigration();
  await checkStatus();

  const rates = await fetchExchangeRates();
  const logs: LogEntry[]   = [];
  const summary: Summary   = { total: 0, matched: 0, needs_review: 0, rejected: 0, already_matched: 0, skipped: 0 };

  // Separately count already-matched for summary context
  if (!FORCE) {
    const { count: wCount } = await supabase.from('wines').select('id', { count: 'exact', head: true }).eq('datafeedr_matched', true);
    const { count: bCount } = await supabase.from('beers').select('id', { count: 'exact', head: true }).eq('datafeedr_matched', true);
    summary.already_matched = (wCount ?? 0) + (bCount ?? 0);
  }

  if (!BEERS_ONLY) await matchWines(rates, logs, summary);
  if (!WINES_ONLY) await matchBeers(rates, logs, summary);

  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
  console.log(`\nLog written → ${LOG_PATH}`);

  console.log('\n─────────────────────────────────────');
  console.log('SUMMARY');
  console.log(`  Total processed:    ${summary.total}`);
  console.log(`  Matched (≥ ${ACCEPT_SCORE}):      ${summary.matched}`);
  console.log(`  Needs review (${REVIEW_SCORE}–${ACCEPT_SCORE - 1}): ${summary.needs_review}`);
  console.log(`  Rejected (< ${REVIEW_SCORE}):     ${summary.rejected}`);
  console.log(`  Already matched:    ${summary.already_matched}`);
  console.log(`  Skipped (errors):   ${summary.skipped}`);
  console.log('─────────────────────────────────────');
})().catch(err => {
  console.error('\nFatal:', err);
  process.exit(1);
});
