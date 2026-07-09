/**
 * GetAlc — Awin + Grapeminds pipeline (100-wine run)
 *
 * Matches Awin wines against Grapeminds, inserts into wines_v2.
 * Accepts matches even with incomplete Grapeminds data — marks
 * needs_reenrichment=true so a re-fetch pass can fill gaps later.
 *
 * Usage (run from PowerShell, not Git Bash):
 *   npx tsx scripts/pipeline-100.ts
 *
 * Options:
 *   LIMIT=50  npx tsx scripts/pipeline-100.ts   ← change batch size
 */

import { createReadStream, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

// ── Load .env.local ──────────────────────────────────────────
for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf-8').split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key?.trim() && rest.length)
    process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY!;
const GRAPEMINDS_KEY = process.env.GRAPEMINDS_API_KEY!;
const GM_BASE        = 'https://api.grapeminds.eu/public/v1';
const TARGET         = parseInt(process.env.LIMIT ?? '100');
const BATCH_SIZE     = 10;

if (!SUPABASE_URL || !SUPABASE_KEY || !GRAPEMINDS_KEY) {
  console.error('Missing env vars. Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, GRAPEMINDS_API_KEY');
  process.exit(1);
}

// ── CSV Parser ───────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function readCSV(filePath: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  let headers: string[] = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (headers.length === 0) { headers = cols; continue; }
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

// ── Parsers ──────────────────────────────────────────────────
function parseProductName(name: string) {
  const sizeMatch = name.match(/[-–]\s*(\d+)\s*ML/i);
  const yearMatch = name.match(/\b(19|20)\d{2}\b/);
  const bottleSizeMl = sizeMatch ? parseInt(sizeMatch[1]) : 750;
  const vintageYear  = yearMatch ? parseInt(yearMatch[0]) : null;
  const wineName = name
    .replace(/\s*[-–]\s*\d+\s*ML.*/i, '')
    .replace(/\b(19|20)\d{2}\b/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { wineName, vintageYear, bottleSizeMl };
}

function parseDescription(desc: string) {
  const get = (pattern: RegExp) => { const m = desc.match(pattern); return m ? m[1].trim() : null; };
  const abvStr = get(/ABV[:\s]+([0-9.]+)\s*%/i);
  return {
    abv:               abvStr ? parseFloat(abvStr) : null,
    wineStyleAwin:     get(/Wine Style[:\s]+([^\n\r]+)/i),
    wineryNameAwin:    get(/Winery[:\s]+([^\n\r]+)/i),
    countryRegionAwin: get(/Country\/Region[:\s]+([^\n\r]+)/i),
    winemakerNotes:    get(/Winemaker['']?s?\s*Notes?[:\s]*([^]*?)(?=\s{2,}|Winery|ABV|$)/i),
  };
}

// ── Grapeminds API ───────────────────────────────────────────
let rateLimitRemaining = 1200;
let lastRequestAt = 0;
// 500ms is the repo's PROVEN gap (see GRAPEMINDS_API.md §4) when run from the user's
// machine. Blocks only occur from datacenter/sandbox IPs — always run this locally.
// Override with GAP_MS if ever needed.
const MIN_REQUEST_GAP = parseInt(process.env.GAP_MS ?? '500');

async function gmFetch(path: string): Promise<any> {
  // Global throttle: never fire two requests closer than MIN_REQUEST_GAP apart.
  // This smooths the bursty 4-requests-per-wine pattern that trips abuse detection.
  const since = Date.now() - lastRequestAt;
  if (since < MIN_REQUEST_GAP) await sleep(MIN_REQUEST_GAP - since);
  lastRequestAt = Date.now();

  if (rateLimitRemaining < 20) {
    console.log('    ⏳ Rate limit low — waiting 15s...');
    await sleep(15000);
  }
  const res = await fetch(`${GM_BASE}${path}`, {
    headers: { Authorization: `Bearer ${GRAPEMINDS_KEY}`, 'Accept-Language': 'en' },
  });
  const remaining = res.headers.get('X-RateLimit-Remaining');
  if (remaining) rateLimitRemaining = parseInt(remaining);

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60');
    console.log(`    ⏳ 429 rate limited — waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return gmFetch(path);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    if (body.includes('blocked') || body.includes('Suspicious')) {
      console.error('\n🚫 API key blocked by Grapeminds. Stop the script and contact support.');
      process.exit(1);
    }
    return null;
  }
  return res.json();
}

async function searchGrapeminds(wineName: string): Promise<number | null> {
  if (wineName.length < 3) return null;
  const data = await gmFetch(`/wines/search?q=${encodeURIComponent(wineName)}&limit=5`);
  return data?.data?.[0]?.id ?? null;
}

// ── Check what's missing (for needs_reenrichment flag) ───────
function checkMissing(wine: any, drinking: any, region: any): string[] {
  const fp = wine.flavor_profile;
  const missing: string[] = [];
  if (!wine.description?.text)    missing.push('description');
  if (!wine.tasting_notes?.text)  missing.push('tasting_notes');
  if (!wine.pairing?.text)        missing.push('pairing');
  if (!wine.grapes?.length)       missing.push('grapes');
  if (fp?.sweetness == null)      missing.push('flavor_profile');
  if (drinking?.from == null)     missing.push('drinking_window');
  if (!region?.summary)           missing.push('region_insights');
  return missing;
}

// ── Supabase upsert ──────────────────────────────────────────
async function upsertWine(record: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wines_v2?on_conflict=awin_product_id`, {
    method: 'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    console.error('    Supabase error:', (await res.text()).slice(0, 200));
    return false;
  }
  return true;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function printBatchSummary(batchNum: number, results: string[]) {
  console.log(`\n── Batch ${batchNum} summary ──────────────────────`);
  results.forEach(r => console.log('  ' + r));
  console.log('──────────────────────────────────────────\n');
}

// ── Resumability: which Awin products are already in the DB ──
async function fetchExistingAwinIds(): Promise<Set<string>> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/wines_v2?select=awin_product_id&limit=10000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  const rows = await res.json() as { awin_product_id: string }[];
  return new Set(rows.map(r => r.awin_product_id));
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\nGetAlc Pipeline — target: ${TARGET} wines\n`);
  const rows = await readCSV(join(process.cwd(), 'awin database.csv'));
  console.log(`Loaded ${rows.length} Awin wines`);

  const existing = await fetchExistingAwinIds();
  console.log(`${existing.size} already in wines_v2 — will skip those (resumable)\n`);

  let inserted    = existing.size; // count toward target so we top up to TARGET total
  let noMatch     = 0;
  let awinSkipped = 0;
  let searched    = 0;
  let batchNum    = 1;
  let batchResults: string[] = [];
  let consecutiveNoMatch = 0; // circuit breaker for a blocked/dead key

  for (const row of rows) {
    if (inserted >= TARGET) break;

    // Skip rows with no usable Awin data
    if (!row.aw_product_id || !row.product_name || !row.search_price || !row.aw_deep_link) {
      awinSkipped++;
      continue;
    }

    // Resumable: skip anything already stored
    if (existing.has(row.aw_product_id)) continue;

    const { wineName, vintageYear, bottleSizeMl } = parseProductName(row.product_name);
    const parsed = parseDescription(row.description ?? '');
    searched++;

    process.stdout.write(`[${searched}] "${wineName}" → `);
    const gmId = await searchGrapeminds(wineName);
    if (!gmId) {
      noMatch++;
      consecutiveNoMatch++;
      console.log('no Grapeminds match');
      batchResults.push(`✗ no match — "${wineName}"`);
      // Circuit breaker: a healthy key matches most well-known wines. 20 in a row
      // means the key is blocked or dead — stop instead of scrolling hundreds.
      if (consecutiveNoMatch >= 20) {
        console.error('\n🚫 20 consecutive no-matches — the API key is almost certainly BLOCKED or invalid.');
        console.error('   A working key matches these wines. Create a fresh key at');
        console.error('   https://grapeminds.eu/api/dashboard, update GRAPEMINDS_API_KEY in .env.local, and re-run.');
        console.error('   (Run is resumable — it will skip everything already saved.)\n');
        process.exit(1);
      }
    } else {
      consecutiveNoMatch = 0;
      // Fetch sequentially so the global throttle spaces every request out.
      // NOTE: /wines/{id} wraps its payload in { data: {...} } — unwrap it.
      // (/drinking-periods and /region-insights are NOT wrapped.)
      const wineData     = (await gmFetch(`/wines/${gmId}`))?.data ?? null;
      const drinkingData = await gmFetch(`/drinking-periods/${gmId}?lang=en`);
      const regionData   = wineData?.region?.id
        ? await gmFetch(`/region-insights/${wineData.region.id}?lang=en`)
        : null;

      const missing = wineData ? checkMissing(wineData, drinkingData, regionData) : ['all'];
      const needsReenrichment = missing.length > 0;

      if (needsReenrichment) {
        console.log(`matched id=${gmId} — missing: [${missing.join(', ')}] — inserting with flag`);
      } else {
        console.log(`matched id=${gmId} — complete ✓`);
      }

      const fp = wineData?.flavor_profile;
      const grapeNames    = (wineData?.grapes ?? []).map((g: any) => g.name).join(', ');
      const sigStyles     = (regionData?.signature_styles ?? []).join('; ');
      const keyGrapeNames = (regionData?.key_grapes ?? []).map((g: any) => g.name).join(', ');

      const record: Record<string, unknown> = {
        // System
        grapeminds_matched:  true,
        grapeminds_licensed: false,
        ai_enriched:         false,
        needs_reenrichment:  needsReenrichment,

        // Awin direct
        awin_product_id:  row.aw_product_id,
        merchant_sku:     row.merchant_product_id || null,
        merchant_name:    row.merchant_name || null,
        in_stock:         row.in_stock === '1' || row.stock_status === 'instock',
        stock_status:     row.stock_status || null,
        price:            row.search_price ? parseFloat(row.search_price) : null,
        rrp_price:        row.rrp_price ? parseFloat(row.rrp_price) : null,
        currency:         row.currency || 'USD',
        image_url:        row.merchant_image_url || row.aw_image_url || null,
        image_thumb_url:  row.aw_thumb_url || row.merchant_thumb_url || null,
        product_url:      row.merchant_deep_link || null,
        affiliate_url:    row.aw_deep_link || null,

        // Parsed from Awin
        wine_name:           wineName || null,
        vintage_year:        vintageYear,
        bottle_size_ml:      bottleSizeMl,
        abv:                 parsed.abv,
        wine_style_awin:     parsed.wineStyleAwin,
        winery_name_awin:    parsed.wineryNameAwin,
        country_region_awin: parsed.countryRegionAwin,
        grape_variety_awin:  row.model_number || null,
        winemaker_notes:     parsed.winemakerNotes,
        description_raw:     row.description || null,

        // Grapeminds identity
        grapeminds_id:           wineData ? String(gmId) : null,
        grapeminds_display_name: wineData?.display_name || null,
        color:                   wineData?.color || null,
        sub_type:                wineData?.sub_type || null,
        residual_sugar:          wineData?.residual_sugar ?? null,

        // Producer
        producer_id:           wineData?.producer?.id ? String(wineData.producer.id) : null,
        producer_name:         wineData?.producer?.name || null,
        producer_title:        wineData?.producer?.title || null,
        producer_display_name: wineData?.producer?.display_name || null,

        // Region
        region_id:      wineData?.region?.id ? String(wineData.region.id) : null,
        region_name:    wineData?.region?.name || null,
        region_country: wineData?.region?.country || null,

        // Grapes
        grapes:      grapeNames || null,
        grapes_json: wineData?.grapes ?? null,

        // Editorial
        description:        wineData?.description?.text || null,
        description_long:   wineData?.description?.text_long || null,
        tasting_notes:      wineData?.tasting_notes?.text || null,
        tasting_notes_long: wineData?.tasting_notes?.text_long || null,
        pairing:            wineData?.pairing?.text || null,
        pairing_long:       wineData?.pairing?.text_long || null,

        // Flavor profile
        flavor_sweetness: fp?.sweetness ?? null,
        flavor_acidity:   fp?.acidity ?? null,
        flavor_tannins:   fp?.tannins ?? null,
        flavor_alcohol:   fp?.alcohol ?? null,
        flavor_body:      fp?.body ?? null,
        flavor_finish:    fp?.finish ?? null,

        // Drinking window
        drinking_from_years: drinkingData?.from ?? null,
        drinking_to_years:   drinkingData?.to ?? null,
        drinking_from_year:  (vintageYear && drinkingData?.from != null) ? vintageYear + drinkingData.from : null,
        drinking_to_year:    (vintageYear && drinkingData?.to   != null) ? vintageYear + drinkingData.to   : null,
        drinking_statement:  drinkingData?.statement || null,
        drinking_young:      drinkingData?.young || null,
        drinking_ripe:       drinkingData?.ripe || null,
        drinking_storage:    drinkingData?.storage || null,

        // Region insights
        region_summary:         regionData?.summary || null,
        region_climate:         regionData?.climate_and_terroir || null,
        region_styles:          sigStyles || null,
        region_styles_json:     regionData?.signature_styles ?? null,
        region_key_grapes:      keyGrapeNames || null,
        region_key_grapes_json: regionData?.key_grapes ?? null,
      };

      const ok = await upsertWine(record);
      if (ok) {
        inserted++;
        const status = needsReenrichment ? `⚡ needs re-enrichment [${missing.join(', ')}]` : '✓ complete';
        batchResults.push(`${status} — "${wineName}" (${wineData?.color ?? '?'})`);
      }
    }

    // Print batch summary every BATCH_SIZE insertions
    if (batchResults.length === BATCH_SIZE || inserted >= TARGET) {
      printBatchSummary(batchNum++, batchResults);
      batchResults = [];
    }
  }

  // Print any remaining results
  if (batchResults.length > 0) printBatchSummary(batchNum, batchResults);

  console.log('═══════════════════════════════════════════════');
  console.log(`DONE`);
  console.log(`  Awin rows skipped (bad data): ${awinSkipped}`);
  console.log(`  Wines searched:               ${searched}`);
  console.log(`  No Grapeminds match:          ${noMatch}`);
  console.log(`  Inserted into wines_v2:       ${inserted}`);
  console.log(`  (Re-enrichment needed on some — run reenrich script next)`);
  console.log('═══════════════════════════════════════════════');
}

main().catch(err => { console.error(err); process.exit(1); });
