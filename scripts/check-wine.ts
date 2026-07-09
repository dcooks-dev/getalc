/**
 * GetAlc — Check a single wine's completeness in Grapeminds
 *
 * There is no "is complete" flag in the API — you must fetch the detail
 * endpoint and inspect the fields. This tool does that for one wine and prints
 * a field-by-field checklist, so you can see exactly what's present/missing
 * before deciding to store or license it.
 *
 * Usage (run locally, not from a sandbox IP):
 *   npx tsx scripts/check-wine.ts 387930          # by Grapeminds ID
 *   npx tsx scripts/check-wine.ts "Caymus Cabernet Sauvignon"   # by name search
 */

import { readFileSync } from 'fs';
import { join } from 'path';

for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf-8').split('\n')) {
  const [k, ...r] = line.split('=');
  if (k?.trim() && r.length) process.env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '');
}

const KEY = process.env.GRAPEMINDS_API_KEY!;
const BASE = 'https://api.grapeminds.eu/public/v1';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let last = 0;
async function gm(path: string): Promise<any> {
  const since = Date.now() - last;
  if (since < 500) await sleep(500 - since);
  last = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, 'Accept-Language': 'en' },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const b = await res.text();
    if (b.includes('blocked') || b.includes('Suspicious')) {
      console.error('🚫 API key blocked — wait a few minutes and retry.');
      process.exit(1);
    }
    console.error(`HTTP ${res.status}: ${b.slice(0, 120)}`);
    return null;
  }
  return res.json();
}

const mark = (ok: boolean) => (ok ? '✅' : '❌ MISSING');
const has = (v: any) => v !== null && v !== undefined && v !== '';

async function main() {
  const arg = process.argv.slice(2).join(' ').trim();
  if (!arg) { console.error('Usage: npx tsx scripts/check-wine.ts <id | "wine name">'); process.exit(1); }

  // Resolve to an ID
  let id = /^\d+$/.test(arg) ? arg : null;
  if (!id) {
    console.log(`Searching for "${arg}"...`);
    const s = await gm(`/wines/search?q=${encodeURIComponent(arg)}&limit=5`);
    if (!s?.data?.length) { console.log('No search match.'); return; }
    console.log('Matches:');
    s.data.forEach((w: any, i: number) => console.log(`  ${i + 1}. [${w.id}] ${w.display_name} (${w.color})`));
    id = String(s.data[0].id);
    console.log(`\nChecking top match → id ${id}\n`);
  }

  const w = (await gm(`/wines/${id}`))?.data ?? null;
  if (!w) { console.log('Wine not found.'); return; }
  const drinking = await gm(`/drinking-periods/${id}?lang=en`);
  const region = w.region?.id ? await gm(`/region-insights/${w.region.id}?lang=en`) : null;
  const fp = w.flavor_profile ?? {};

  console.log(`═══ ${w.display_name} (id ${id}) ═══`);
  console.log(`Color: ${w.color ?? '-'} | Sub-type: ${w.sub_type ?? '-'} | Producer: ${w.producer?.name ?? '-'}`);
  console.log(`Region: ${w.region?.name ?? '-'} (${w.region?.country ?? '-'})\n`);

  const rows: [string, boolean][] = [
    ['description',        has(w.description?.text)],
    ['description_long',   has(w.description?.text_long)],
    ['tasting_notes',      has(w.tasting_notes?.text)],
    ['pairing',            has(w.pairing?.text)],
    ['grapes',             !!w.grapes?.length],
    ['flavor.sweetness',   fp.sweetness != null],
    ['flavor.acidity',     fp.acidity != null],
    ['flavor.tannins',     fp.tannins != null],
    ['flavor.alcohol',     fp.alcohol != null],
    ['flavor.body',        fp.body != null],
    ['flavor.finish',      fp.finish != null],
    ['drinking_window',    drinking?.from != null],
    ['region_insights',    has(region?.summary)],
  ];

  for (const [name, ok] of rows) console.log(`  ${mark(ok).padEnd(11)} ${name}`);

  const missing = rows.filter(([, ok]) => !ok).map(([n]) => n);
  console.log(`\n${missing.length === 0 ? '🎉 COMPLETE — safe to store/license.' : `⚠ Incomplete — missing ${missing.length}: ${missing.join(', ')}`}`);
}

main().catch(e => { console.error(e); process.exit(1); });
