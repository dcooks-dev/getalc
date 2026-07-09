/**
 * GetAlc — Collect naturally-complete wines
 *
 * Scans Awin wines, matches against Grapeminds, and inserts ONLY wines that
 * come back 100% complete from Grapeminds (full editorial + flavor + grapes +
 * drinking window + region insights). Obscure wines Grapeminds has no data for
 * are recorded as "evaluated" and skipped on future runs — so repeat runs
 * always advance to fresh candidates.
 *
 * Stops when the wines_v2 complete-count reaches TARGET (default 50).
 *
 * Run in small chunks to stay under Grapeminds' abuse detection:
 *   npx tsx scripts/collect-complete.ts        (evaluates 10 candidates/run)
 *   MAXEVAL=15 npx tsx scripts/collect-complete.ts
 * Wait a few minutes between runs. Must run from your machine (not a sandbox IP).
 */

import { createReadStream, readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf-8').split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key?.trim() && rest.length)
    process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY!;
const GRAPEMINDS_KEY = process.env.GRAPEMINDS_API_KEY!;
const GM_BASE        = 'https://api.grapeminds.eu/public/v1';
const TARGET         = parseInt(process.env.TARGET ?? '50');   // total complete wines wanted
const MAXEVAL        = parseInt(process.env.MAXEVAL ?? '10');  // candidates to evaluate per run
const PROGRESS_FILE  = join(process.cwd(), 'scripts', 'collect-progress.json');

if (!SUPABASE_URL || !SUPABASE_KEY || !GRAPEMINDS_KEY) {
  console.error('Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, GRAPEMINDS_API_KEY)');
  process.exit(1);
}

// ── CSV ──────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}
async function readCSV(path: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = []; let headers: string[] = [];
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (!headers.length) { headers = cols; continue; }
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = cols[i] ?? ''; });
    rows.push(o);
  }
  return rows;
}

// ── Parsers ──────────────────────────────────────────────────
function parseProductName(name: string) {
  const size = name.match(/[-–]\s*(\d+)\s*ML/i);
  const year = name.match(/\b(19|20)\d{2}\b/);
  return {
    wineName: name.replace(/\s*[-–]\s*\d+\s*ML.*/i, '').replace(/\b(19|20)\d{2}\b/, '').replace(/\s+/g, ' ').trim(),
    vintageYear: year ? parseInt(year[0]) : null,
    bottleSizeMl: size ? parseInt(size[1]) : 750,
  };
}
function parseDescription(desc: string) {
  const g = (p: RegExp) => { const m = desc.match(p); return m ? m[1].trim() : null; };
  const abv = g(/ABV[:\s]+([0-9.]+)\s*%/i);
  return {
    abv: abv ? parseFloat(abv) : null,
    wineStyleAwin: g(/Wine Style[:\s]+([^\n\r]+)/i),
    wineryNameAwin: g(/Winery[:\s]+([^\n\r]+)/i),
    countryRegionAwin: g(/Country\/Region[:\s]+([^\n\r]+)/i),
    winemakerNotes: g(/Winemaker['']?s?\s*Notes?[:\s]*([^]*?)(?=\s{2,}|Winery|ABV|$)/i),
  };
}

// ── Grapeminds ───────────────────────────────────────────────
let lastReq = 0;
const GAP = parseInt(process.env.GAP_MS ?? '500');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function gm(path: string): Promise<any> {
  const since = Date.now() - lastReq;
  if (since < GAP) await sleep(GAP - since);
  lastReq = Date.now();
  const res = await fetch(`${GM_BASE}${path}`, {
    headers: { Authorization: `Bearer ${GRAPEMINDS_KEY}`, 'Accept-Language': 'en' },
  });
  if (res.status === 429) {
    const ra = parseInt(res.headers.get('Retry-After') ?? '60');
    console.log(`  ⏳ 429 — waiting ${ra}s`); await sleep(ra * 1000); return gm(path);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const b = await res.text();
    if (b.includes('blocked') || b.includes('Suspicious')) {
      console.error('\n🚫 API key blocked. Stop and wait a few minutes, then re-run (progress is saved).');
      saveProgress();
      process.exit(1);
    }
    return null;
  }
  return res.json();
}

// editorial/flavor/grapes are the fields obscure wines lack — check these first
function wineCoreComplete(w: any): boolean {
  const fp = w?.flavor_profile;
  return !!(
    w?.description?.text && w?.tasting_notes?.text && w?.pairing?.text &&
    w?.grapes?.length &&
    fp && fp.sweetness != null && fp.acidity != null && fp.tannins != null &&
    fp.alcohol != null && fp.body != null && fp.finish != null
  );
}

// ── Supabase ─────────────────────────────────────────────────
async function existingAwinIds(): Promise<Set<string>> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/wines_v2?select=awin_product_id&limit=10000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return new Set((await r.json() as any[]).map(x => x.awin_product_id));
}
async function completeCount(): Promise<number> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/wines_v2?needs_reenrichment=eq.false&select=id&limit=10000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return (await r.json() as any[]).length;
}
async function insert(record: Record<string, unknown>): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/wines_v2?on_conflict=awin_product_id`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(record),
  });
  if (!r.ok) { console.error('  insert error:', (await r.text()).slice(0, 160)); return false; }
  return true;
}

// ── Progress file (evaluated Awin ids) ───────────────────────
let evaluated = new Set<string>();
function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try { evaluated = new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')).evaluated ?? []); }
    catch { evaluated = new Set(); }
  }
}
function saveProgress() {
  writeFileSync(PROGRESS_FILE, JSON.stringify({ evaluated: [...evaluated] }, null, 0));
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  loadProgress();
  const rawRows = await readCSV(join(process.cwd(), 'awin database.csv'));
  const inDb = await existingAwinIds();
  let complete = await completeCount();

  // Test the most-likely-complete wines FIRST: premium/famous wines are far more
  // likely to have full Grapeminds data, so ranking by price desc maximizes the
  // keep-rate per search — fewer API calls to reach the target, less block risk.
  // Optional MINPRICE floor skips cheap wines entirely.
  const MINPRICE = parseFloat(process.env.MINPRICE ?? '0');
  const rows = rawRows
    .filter((r) => {
      const p = parseFloat(r.search_price);
      return !isNaN(p) && p >= MINPRICE;
    })
    .sort((a, b) => parseFloat(b.search_price) - parseFloat(a.search_price));

  console.log(`\nCollect-complete — target ${TARGET} complete wines`);
  console.log(`Currently complete: ${complete} | already-evaluated: ${evaluated.size} | in DB: ${inDb.size}`);
  console.log(`Evaluating up to ${MAXEVAL} candidates this run, highest-priced first${MINPRICE ? ` (price >= $${MINPRICE})` : ''}\n`);

  if (complete >= TARGET) { console.log(`🎉 Already at ${complete} complete — target met.`); return; }

  let evaluatedThisRun = 0, kept = 0, rejected = 0, noMatch = 0;

  for (const row of rows) {
    if (complete >= TARGET) break;
    if (evaluatedThisRun >= MAXEVAL) break;
    if (!row.aw_product_id || !row.product_name || !row.search_price || !row.aw_deep_link) continue;
    if (inDb.has(row.aw_product_id) || evaluated.has(row.aw_product_id)) continue;

    const { wineName, vintageYear, bottleSizeMl } = parseProductName(row.product_name);
    const parsed = parseDescription(row.description ?? '');
    evaluatedThisRun++;
    process.stdout.write(`[${evaluatedThisRun}/${MAXEVAL}] $${row.search_price} "${wineName}" → `);

    // search
    const s = await gm(`/wines/search?q=${encodeURIComponent(wineName)}&limit=5`);
    const gmId = s?.data?.[0]?.id ?? null;
    if (!gmId) { noMatch++; evaluated.add(row.aw_product_id); saveProgress(); console.log('no match'); continue; }

    // detail
    const w = (await gm(`/wines/${gmId}`))?.data ?? null;
    if (!w) { noMatch++; evaluated.add(row.aw_product_id); saveProgress(); console.log('detail fetch failed'); continue; }

    const coreOk = wineCoreComplete(w);
    // Only spend drinking + region calls on wines whose core is already complete.
    // For the rest we store identity flagged — enrichment (triggered by this fetch) fills later.
    const drinking = coreOk ? await gm(`/drinking-periods/${gmId}?lang=en`) : null;
    const region = coreOk && w?.region?.id ? await gm(`/region-insights/${w.region.id}?lang=en`) : null;
    const isComplete = coreOk && drinking?.from != null && !!region?.summary;

    const fp = w.flavor_profile ?? {};
    const record: Record<string, unknown> = {
      grapeminds_matched: true, grapeminds_licensed: false, ai_enriched: false, needs_reenrichment: !isComplete,
      awin_product_id: row.aw_product_id, merchant_sku: row.merchant_product_id || null,
      merchant_name: row.merchant_name || null,
      in_stock: row.in_stock === '1' || row.stock_status === 'instock', stock_status: row.stock_status || null,
      price: row.search_price ? parseFloat(row.search_price) : null,
      rrp_price: row.rrp_price ? parseFloat(row.rrp_price) : null,
      currency: row.currency || 'USD',
      image_url: row.merchant_image_url || row.aw_image_url || null,
      image_thumb_url: row.aw_thumb_url || row.merchant_thumb_url || null,
      product_url: row.merchant_deep_link || null, affiliate_url: row.aw_deep_link || null,
      wine_name: wineName || null, vintage_year: vintageYear, bottle_size_ml: bottleSizeMl,
      abv: parsed.abv, wine_style_awin: parsed.wineStyleAwin, winery_name_awin: parsed.wineryNameAwin,
      country_region_awin: parsed.countryRegionAwin, grape_variety_awin: row.model_number || null,
      winemaker_notes: parsed.winemakerNotes, description_raw: row.description || null,
      grapeminds_id: String(gmId), grapeminds_display_name: w.display_name || null,
      color: w.color || null, sub_type: w.sub_type || null, residual_sugar: w.residual_sugar ?? null,
      producer_id: w.producer?.id ? String(w.producer.id) : null, producer_name: w.producer?.name || null,
      producer_title: w.producer?.title || null, producer_display_name: w.producer?.display_name || null,
      region_id: w.region?.id ? String(w.region.id) : null, region_name: w.region?.name || null,
      region_country: w.region?.country || null,
      grapes: (w.grapes ?? []).map((g: any) => g.name).join(', ') || null, grapes_json: w.grapes ?? null,
      description: w.description?.text || null, description_long: w.description?.text_long || null,
      tasting_notes: w.tasting_notes?.text || null, tasting_notes_long: w.tasting_notes?.text_long || null,
      pairing: w.pairing?.text || null, pairing_long: w.pairing?.text_long || null,
      flavor_sweetness: fp.sweetness ?? null, flavor_acidity: fp.acidity ?? null, flavor_tannins: fp.tannins ?? null,
      flavor_alcohol: fp.alcohol ?? null, flavor_body: fp.body ?? null, flavor_finish: fp.finish ?? null,
      drinking_from_years: drinking?.from ?? null, drinking_to_years: drinking?.to ?? null,
      drinking_from_year: (vintageYear != null && drinking?.from != null) ? vintageYear + drinking.from : null,
      drinking_to_year: (vintageYear != null && drinking?.to != null) ? vintageYear + drinking.to : null,
      drinking_statement: drinking?.statement || null, drinking_young: drinking?.young || null,
      drinking_ripe: drinking?.ripe || null, drinking_storage: drinking?.storage || null,
      region_summary: region?.summary || null, region_climate: region?.climate_and_terroir || null,
      region_styles: (region?.signature_styles ?? []).join('; ') || null,
      region_styles_json: region?.signature_styles ?? null,
      region_key_grapes: (region?.key_grapes ?? []).map((g: any) => g.name).join(', ') || null,
      region_key_grapes_json: region?.key_grapes ?? null,
    };

    const ok = await insert(record);
    evaluated.add(row.aw_product_id); saveProgress();
    if (ok) {
      if (isComplete) { kept++; complete++; console.log(`✓ COMPLETE — kept (${complete}/${TARGET}) [${w.color}]`); }
      else { rejected++; console.log(`banked (enriching) — ${w.display_name ?? wineName}`); }
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Run done`);
  console.log(`  Evaluated this run: ${evaluatedThisRun}  (complete ${kept}, banked-for-later ${rejected}, no-match ${noMatch})`);
  console.log(`  Complete total now: ${complete}/${TARGET}`);
  console.log(complete >= TARGET
    ? `  🎉 Target reached!`
    : `  → Wait a few minutes, then run again: npx tsx scripts/collect-complete.ts`);
  console.log('═══════════════════════════════════════');
}

main().catch(e => { console.error(e); saveProgress(); process.exit(1); });
