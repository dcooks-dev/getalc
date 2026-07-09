/**
 * GetAlc — Batch-check DB wines against Grapeminds for completeness
 *
 * Takes wines already stored in wines_v2 that are still flagged
 * (needs_reenrichment = true), and checks 5 at a time against Grapeminds to
 * see whether ALL data is now present for each bottle.
 *
 * Incremental by design: bottles are picked least-recently-checked first, and
 * checking a bottle bumps its updated_at — so the next run automatically moves
 * on to the NEXT 5 (first 5, then next 5, and so on), cycling through all of
 * them. Run once, wait ~5 minutes, run again.
 *
 * When a bottle is found 100% complete, its data is written in and the flag is
 * cleared (so it counts toward your 50). Incomplete bottles are left flagged
 * and reported field-by-field.
 *
 * Run locally (not from a sandbox IP):
 *   npx tsx scripts/check-db-batch.ts
 *   BATCH=5 npx tsx scripts/check-db-batch.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf-8').split('\n')) {
  const [k, ...r] = line.split('=');
  if (k?.trim() && r.length) process.env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const GM_KEY       = process.env.GRAPEMINDS_API_KEY!;
const GM_BASE      = 'https://api.grapeminds.eu/public/v1';
const BATCH        = parseInt(process.env.BATCH ?? '5');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const has = (v: any) => v !== null && v !== undefined && v !== '';

// ── Grapeminds fetch (throttled, block-aware) ────────────────
let last = 0;
async function gm(path: string): Promise<any> {
  const since = Date.now() - last;
  if (since < 500) await sleep(500 - since);
  last = Date.now();
  const res = await fetch(`${GM_BASE}${path}`, {
    headers: { Authorization: `Bearer ${GM_KEY}`, 'Accept-Language': 'en' },
  });
  if (res.status === 429) {
    const ra = parseInt(res.headers.get('Retry-After') ?? '60');
    console.log(`  ⏳ 429 — waiting ${ra}s`); await sleep(ra * 1000); return gm(path);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const b = await res.text();
    if (b.includes('blocked') || b.includes('Suspicious')) {
      console.error('\n🚫 API key blocked — wait a few minutes and re-run (progress is saved in DB).');
      process.exit(1);
    }
    return null;
  }
  return res.json();
}

// ── Which fields must be present for "complete" ──────────────
function missingFields(w: any, drinking: any, region: any): string[] {
  const fp = w?.flavor_profile ?? {};
  const m: string[] = [];
  if (!has(w?.description?.text))   m.push('description');
  if (!has(w?.tasting_notes?.text)) m.push('tasting_notes');
  if (!has(w?.pairing?.text))       m.push('pairing');
  if (!w?.grapes?.length)           m.push('grapes');
  if (fp.sweetness == null || fp.acidity == null || fp.tannins == null ||
      fp.alcohol == null || fp.body == null || fp.finish == null) m.push('flavor_profile');
  if (drinking?.from == null)       m.push('drinking_window');
  if (!has(region?.summary))        m.push('region_insights');
  return m;
}

// ── Supabase ─────────────────────────────────────────────────
async function fetchFlaggedRows(): Promise<any[]> {
  // All flagged rows, least-recently-updated first.
  const url = `${SUPABASE_URL}/rest/v1/wines_v2?needs_reenrichment=eq.true&grapeminds_id=not.is.null` +
    `&select=id,grapeminds_id,vintage_year,wine_name,grapeminds_display_name&order=updated_at.asc&limit=10000`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return r.json();
}
// One representative row per unique Grapeminds wine (keeps least-recently-updated).
function dedupeByWine(rows: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const row of rows) {
    if (seen.has(row.grapeminds_id)) continue;
    seen.add(row.grapeminds_id);
    out.push(row);
  }
  return out;
}
// PATCH every row that shares this grapeminds_id (so all duplicate bottles update together).
async function patchByWine(grapemindsId: string, body: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/wines_v2?grapeminds_id=eq.${grapemindsId}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

function fullPatch(w: any, drinking: any, region: any, vy: number | null): Record<string, unknown> {
  const fp = w?.flavor_profile ?? {};
  return {
    needs_reenrichment: false,
    grapeminds_display_name: w?.display_name ?? null,
    color: w?.color ?? null, sub_type: w?.sub_type ?? null, residual_sugar: w?.residual_sugar ?? null,
    producer_id: w?.producer?.id ? String(w.producer.id) : null, producer_name: w?.producer?.name ?? null,
    producer_title: w?.producer?.title ?? null, producer_display_name: w?.producer?.display_name ?? null,
    region_id: w?.region?.id ? String(w.region.id) : null, region_name: w?.region?.name ?? null,
    region_country: w?.region?.country ?? null,
    grapes: (w?.grapes ?? []).map((g: any) => g.name).join(', ') || null, grapes_json: w?.grapes ?? null,
    description: w?.description?.text ?? null, description_long: w?.description?.text_long ?? null,
    tasting_notes: w?.tasting_notes?.text ?? null, tasting_notes_long: w?.tasting_notes?.text_long ?? null,
    pairing: w?.pairing?.text ?? null, pairing_long: w?.pairing?.text_long ?? null,
    flavor_sweetness: fp.sweetness ?? null, flavor_acidity: fp.acidity ?? null, flavor_tannins: fp.tannins ?? null,
    flavor_alcohol: fp.alcohol ?? null, flavor_body: fp.body ?? null, flavor_finish: fp.finish ?? null,
    drinking_from_years: drinking?.from ?? null, drinking_to_years: drinking?.to ?? null,
    drinking_from_year: vy != null && drinking?.from != null ? vy + drinking.from : null,
    drinking_to_year: vy != null && drinking?.to != null ? vy + drinking.to : null,
    drinking_statement: drinking?.statement ?? null, drinking_young: drinking?.young ?? null,
    drinking_ripe: drinking?.ripe ?? null, drinking_storage: drinking?.storage ?? null,
    region_summary: region?.summary ?? null, region_climate: region?.climate_and_terroir ?? null,
    region_styles: (region?.signature_styles ?? []).join('; ') || null,
    region_styles_json: region?.signature_styles ?? null,
    region_key_grapes: (region?.key_grapes ?? []).map((g: any) => g.name).join(', ') || null,
    region_key_grapes_json: region?.key_grapes ?? null,
  };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const allFlagged = await fetchFlaggedRows();
  const uniqueWines = dedupeByWine(allFlagged);
  console.log(`\nDB completeness check — ${allFlagged.length} flagged rows (${uniqueWines.length} unique wines)`);
  if (uniqueWines.length === 0) { console.log('🎉 Nothing flagged — every bottle is complete!'); return; }

  const batch = uniqueWines.slice(0, BATCH); // 5 UNIQUE wines, least-recently-checked first
  console.log(`Checking next ${batch.length} unique wines (BATCH=${BATCH})\n`);

  let winesCompleted = 0;
  let rowsCleared = 0;
  for (let i = 0; i < batch.length; i++) {
    const b = batch[i];
    const dupes = allFlagged.filter((r) => r.grapeminds_id === b.grapeminds_id).length;
    const dupeNote = dupes > 1 ? ` (${dupes} bottles)` : '';
    const name = b.grapeminds_display_name || b.wine_name || b.grapeminds_id;
    const w = (await gm(`/wines/${b.grapeminds_id}`))?.data ?? null;
    const drinking = await gm(`/drinking-periods/${b.grapeminds_id}?lang=en`);
    const region = w?.region?.id ? await gm(`/region-insights/${w.region.id}?lang=en`) : null;

    const missing = missingFields(w, drinking, region);
    if (missing.length === 0) {
      await patchByWine(b.grapeminds_id, fullPatch(w, drinking, region, b.vintage_year));
      winesCompleted++; rowsCleared += dupes;
      console.log(`[${i + 1}/${batch.length}] ✅ COMPLETE — ${name}${dupeNote}  → stored & flag cleared`);
    } else {
      // touch every row of this wine so the group rotates to the back of the queue
      await patchByWine(b.grapeminds_id, { needs_reenrichment: true });
      console.log(`[${i + 1}/${batch.length}] ❌ still missing [${missing.join(', ')}] — ${name}${dupeNote}`);
    }
  }

  const remainingWines = uniqueWines.length - winesCompleted;
  console.log('\n═══════════════════════════════════════');
  console.log(`Checked ${batch.length} unique wines — ${winesCompleted} became complete (${rowsCleared} rows cleared)`);
  console.log(`Unique wines still flagged: ${remainingWines}`);
  console.log(remainingWines > 0
    ? `→ Wait ~5 minutes, then run again for the NEXT ${BATCH}: npx tsx scripts/check-db-batch.ts`
    : `🎉 All wines complete!`);
  console.log('═══════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
