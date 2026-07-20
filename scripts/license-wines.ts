/**
 * GetAlc — Acquire Grapeminds Persistent Storage Licenses
 *
 * POST /licence/{wine_id} for each complete, unlicensed wine.
 *   201 = newly licensed (billed ~€0.38)   200 = already licensed (no charge)
 * Idempotent, so re-running is safe. Sets grapeminds_licensed +
 * grapeminds_licensed_at from the API response.
 *
 * SAFETY: dry-run by default — it only prints the plan + estimated cost.
 * It charges ONLY when you pass CONFIRM=1.
 *
 * Requires: active subscription + accepted Persistent Storage License terms
 * (else the API returns 402/403).
 *
 * Run locally (Grapeminds is IP-blocked from sandboxes):
 *   npx tsx scripts/license-wines.ts                 # dry run: shows cost, charges nothing
 *   CONFIRM=1 npx tsx scripts/license-wines.ts       # actually license (chunk of BATCH)
 *   CONFIRM=1 BATCH=56 npx tsx scripts/license-wines.ts   # license all in one run
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
const CONFIRM      = process.env.CONFIRM === '1';
const BATCH        = parseInt(process.env.BATCH ?? '10');
const PRICE_EUR    = 0.38;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

if (!SUPABASE_URL || !SUPABASE_KEY || !GM_KEY) {
  console.error('Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, GRAPEMINDS_API_KEY)');
  process.exit(1);
}

// ── Grapeminds POST (throttled, error-aware) ─────────────────
let last = 0;
async function licence(wineId: string): Promise<{ ok: boolean; status: number; licensed_at?: string; message?: string }> {
  const since = Date.now() - last;
  if (since < 600) await sleep(600 - since);
  last = Date.now();
  const res = await fetch(`${GM_BASE}/licence/${wineId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GM_KEY}`, 'Accept-Language': 'en' },
  });
  if (res.status === 429) {
    const ra = parseInt(res.headers.get('Retry-After') ?? '60');
    console.log(`  ⏳ 429 — waiting ${ra}s`); await sleep(ra * 1000); return licence(wineId);
  }
  let body: any = {};
  try { body = await res.json(); } catch {}
  if (res.status === 402) { console.error('\n🚫 402 — no active subscription. Stop.'); process.exit(1); }
  if (res.status === 403) {
    const t = JSON.stringify(body);
    if (/blocked|suspicious/i.test(t)) { console.error('\n🚫 API key blocked — wait and retry.'); process.exit(1); }
    console.error('\n🚫 403 — accept the Persistent Storage License terms in the dashboard first. Stop.');
    process.exit(1);
  }
  return { ok: res.ok, status: res.status, licensed_at: body?.licensed_at, message: body?.message };
}

// ── Supabase ─────────────────────────────────────────────────
async function fetchUnlicensed(): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/wines_v2?needs_reenrichment=eq.false&grapeminds_licensed=eq.false` +
    `&grapeminds_id=not.is.null&select=id,grapeminds_id,grapeminds_display_name,wine_name&order=grapeminds_id.asc&limit=1000`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return r.json();
}
function dedupe(rows: any[]): any[] {
  const seen = new Set<string>(); const out: any[] = [];
  for (const row of rows) { if (!seen.has(row.grapeminds_id)) { seen.add(row.grapeminds_id); out.push(row); } }
  return out;
}
async function markLicensed(grapemindsId: string, licensedAt: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/wines_v2?grapeminds_id=eq.${grapemindsId}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ grapeminds_licensed: true, grapeminds_licensed_at: licensedAt }),
  });
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const wines = dedupe(await fetchUnlicensed());
  console.log(`\nGrapeminds licensing — ${wines.length} complete, unlicensed wines`);
  console.log(`Estimated cost if all newly licensed: €${(wines.length * PRICE_EUR).toFixed(2)} (€${PRICE_EUR}/wine)\n`);

  if (wines.length === 0) { console.log('🎉 Nothing to license — all complete wines are already licensed.'); return; }

  if (!CONFIRM) {
    console.log('DRY RUN — no charges made. Wines that would be licensed:');
    wines.forEach((w, i) => console.log(`  ${i + 1}. [${w.grapeminds_id}] ${w.grapeminds_display_name || w.wine_name}`));
    console.log(`\nTo actually license (chunk of ${BATCH}): CONFIRM=1 npx tsx scripts/license-wines.ts`);
    console.log(`To license all at once:                CONFIRM=1 BATCH=${wines.length} npx tsx scripts/license-wines.ts`);
    return;
  }

  const batch = wines.slice(0, BATCH);
  console.log(`CONFIRM set — licensing ${batch.length} this run...\n`);
  let newly = 0, already = 0, charged = 0;
  for (let i = 0; i < batch.length; i++) {
    const w = batch[i];
    const name = w.grapeminds_display_name || w.wine_name || w.grapeminds_id;
    const res = await licence(w.grapeminds_id);
    if (res.ok && res.licensed_at) {
      await markLicensed(w.grapeminds_id, res.licensed_at);
      if (res.status === 201) { newly++; charged++; console.log(`[${i + 1}/${batch.length}] ✓ licensed (NEW, charged) — ${name}`); }
      else { already++; console.log(`[${i + 1}/${batch.length}] ✓ already licensed (no charge) — ${name}`); }
    } else {
      console.log(`[${i + 1}/${batch.length}] ✗ failed (${res.status}) — ${name}`);
    }
  }

  const remaining = wines.length - batch.length;
  console.log('\n═══════════════════════════════════════');
  console.log(`Licensed this run: ${batch.length}  (new: ${newly}, already: ${already})`);
  console.log(`Charged this run:  €${(charged * PRICE_EUR).toFixed(2)}`);
  console.log(remaining > 0
    ? `Remaining unlicensed: ${remaining} → run again: CONFIRM=1 npx tsx scripts/license-wines.ts`
    : `🎉 All complete wines are now licensed.`);
  console.log('═══════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
