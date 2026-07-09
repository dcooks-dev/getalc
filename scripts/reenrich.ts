/**
 * GetAlc — Re-enrichment pass
 *
 * Grapeminds enriches wine data lazily: the first fetch of a wine returns a
 * sparse record and triggers background AI generation. This script re-fetches
 * every wines_v2 row flagged needs_reenrichment=true, updates it with whatever
 * data is now available, and clears the flag once the wine is complete.
 *
 * Run this repeatedly (with a few minutes between runs) until the complete
 * count stops rising.
 *
 * Usage (PowerShell):
 *   npx tsx scripts/reenrich.ts
 */

import { readFileSync } from 'fs';
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
// Process only this many bottles per run, then stop. Override with BATCH=N.
// Keep it small (2) and wait several minutes between runs to avoid the
// Grapeminds "suspicious access pattern" block.
const BATCH          = parseInt(process.env.BATCH ?? '2');

// ── Grapeminds fetch with global throttle + block detection ──
let lastRequestAt = 0;
const MIN_REQUEST_GAP = 500;
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function gmFetch(path: string): Promise<any> {
  const since = Date.now() - lastRequestAt;
  if (since < MIN_REQUEST_GAP) await sleep(MIN_REQUEST_GAP - since);
  lastRequestAt = Date.now();

  const res = await fetch(`${GM_BASE}${path}`, {
    headers: { Authorization: `Bearer ${GRAPEMINDS_KEY}`, 'Accept-Language': 'en' },
  });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60');
    console.log(`  ⏳ 429 — waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return gmFetch(path);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    if (body.includes('blocked') || body.includes('Suspicious')) {
      console.error('\n🚫 API key blocked. Stop and contact Grapeminds.');
      process.exit(1);
    }
    return null;
  }
  return res.json();
}

function checkMissing(wine: any, drinking: any, region: any): string[] {
  const fp = wine?.flavor_profile;
  const missing: string[] = [];
  if (!wine?.description?.text)   missing.push('description');
  if (!wine?.tasting_notes?.text) missing.push('tasting_notes');
  if (!wine?.pairing?.text)       missing.push('pairing');
  if (!wine?.grapes?.length)      missing.push('grapes');
  if (fp?.sweetness == null)      missing.push('flavor_profile');
  if (drinking?.from == null)     missing.push('drinking_window');
  if (!region?.summary)           missing.push('region_insights');
  return missing;
}

// ── Supabase helpers ─────────────────────────────────────────
async function fetchFlagged(): Promise<any[]> {
  // Order by updated_at ascending so each run picks the LEAST-recently-touched
  // flagged bottles. Every attempt bumps updated_at (DB trigger), rotating the
  // queue so runs move through all bottles instead of retrying the same 2.
  const url = `${SUPABASE_URL}/rest/v1/wines_v2?needs_reenrichment=eq.true&grapeminds_id=not.is.null&select=id,grapeminds_id,vintage_year,region_id&order=updated_at.asc&limit=1000`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

async function patchWine(id: string, patch: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wines_v2?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) { console.error('  patch failed:', (await res.text()).slice(0, 150)); return false; }
  return true;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\nGetAlc Re-enrichment pass\n');
  const flagged = await fetchFlagged();
  console.log(`${flagged.length} wines still need enrichment`);

  // Only touch BATCH bottles this run, then stop — you wait a few minutes and
  // re-run. This keeps us far under the abuse-detection threshold.
  const batch = flagged.slice(0, BATCH);
  console.log(`Processing ${batch.length} this run (BATCH=${BATCH}); ${flagged.length - batch.length} will remain for later runs\n`);
  if (!flagged.length) { console.log('Nothing to do — all complete!'); return; }

  let nowComplete = 0;
  let stillPartial = 0;
  let i = 0;

  for (const w of batch) {
    i++;
    const gmId = w.grapeminds_id;
    const wineData     = (await gmFetch(`/wines/${gmId}`))?.data ?? null;
    const drinkingData = await gmFetch(`/drinking-periods/${gmId}?lang=en`);
    const regionData   = wineData?.region?.id
      ? await gmFetch(`/region-insights/${wineData.region.id}?lang=en`)
      : null;

    const missing = checkMissing(wineData, drinkingData, regionData);
    const complete = missing.length === 0;

    const fp = wineData?.flavor_profile;
    const vy = w.vintage_year as number | null;
    const patch: Record<string, unknown> = {
      needs_reenrichment: !complete,
      grapeminds_display_name: wineData?.display_name ?? null,
      color:      wineData?.color ?? null,
      sub_type:   wineData?.sub_type ?? null,
      residual_sugar: wineData?.residual_sugar ?? null,
      producer_id:           wineData?.producer?.id ? String(wineData.producer.id) : null,
      producer_name:         wineData?.producer?.name ?? null,
      producer_title:        wineData?.producer?.title ?? null,
      producer_display_name: wineData?.producer?.display_name ?? null,
      region_id:      wineData?.region?.id ? String(wineData.region.id) : null,
      region_name:    wineData?.region?.name ?? null,
      region_country: wineData?.region?.country ?? null,
      grapes:      (wineData?.grapes ?? []).map((g: any) => g.name).join(', ') || null,
      grapes_json: wineData?.grapes ?? null,
      description:        wineData?.description?.text ?? null,
      description_long:   wineData?.description?.text_long ?? null,
      tasting_notes:      wineData?.tasting_notes?.text ?? null,
      tasting_notes_long: wineData?.tasting_notes?.text_long ?? null,
      pairing:            wineData?.pairing?.text ?? null,
      pairing_long:       wineData?.pairing?.text_long ?? null,
      flavor_sweetness: fp?.sweetness ?? null,
      flavor_acidity:   fp?.acidity ?? null,
      flavor_tannins:   fp?.tannins ?? null,
      flavor_alcohol:   fp?.alcohol ?? null,
      flavor_body:      fp?.body ?? null,
      flavor_finish:    fp?.finish ?? null,
      drinking_from_years: drinkingData?.from ?? null,
      drinking_to_years:   drinkingData?.to ?? null,
      drinking_from_year:  (vy && drinkingData?.from != null) ? vy + drinkingData.from : null,
      drinking_to_year:    (vy && drinkingData?.to   != null) ? vy + drinkingData.to   : null,
      drinking_statement:  drinkingData?.statement ?? null,
      drinking_young:      drinkingData?.young ?? null,
      drinking_ripe:       drinkingData?.ripe ?? null,
      drinking_storage:    drinkingData?.storage ?? null,
      region_summary:         regionData?.summary ?? null,
      region_climate:         regionData?.climate_and_terroir ?? null,
      region_styles:          (regionData?.signature_styles ?? []).join('; ') || null,
      region_styles_json:     regionData?.signature_styles ?? null,
      region_key_grapes:      (regionData?.key_grapes ?? []).map((g: any) => g.name).join(', ') || null,
      region_key_grapes_json: regionData?.key_grapes ?? null,
    };

    await patchWine(w.id, patch);
    if (complete) { nowComplete++; console.log(`[${i}/${batch.length}] ✓ ${wineData?.display_name ?? gmId} — now complete`); }
    else { stillPartial++; console.log(`[${i}/${batch.length}] … ${wineData?.display_name ?? gmId} — still missing [${missing.join(', ')}]`); }
  }

  const remaining = flagged.length - nowComplete;
  console.log('\n═══════════════════════════════════════');
  console.log(`Re-enrichment run done (BATCH=${BATCH})`);
  console.log(`  Completed this run:  ${nowComplete}`);
  console.log(`  Still partial:       ${stillPartial}`);
  console.log(`  Flagged remaining:   ${remaining}`);
  console.log(remaining > 0
    ? `  → Wait ~4 minutes, then run again: npx tsx scripts/reenrich.ts`
    : `  → All 50 bottles complete! 🎉`);
  console.log('═══════════════════════════════════════');
}

main().catch(err => { console.error(err); process.exit(1); });
