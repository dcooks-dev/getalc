/**
 * GetAlc — Export existing wines table to a JSON backup file
 *
 * Usage:
 *   npx tsx scripts/export-wines-backup.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local
const envPath = join(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length)
    process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function main() {
  console.log('Fetching all rows from wines table...');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/wines?select=*`, {
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    console.error(`Supabase error ${res.status}:`, await res.text());
    process.exit(1);
  }

  const data = await res.json() as Record<string, unknown>[];

  if (!data.length) {
    console.log('No rows found in wines table.');
    process.exit(0);
  }

  const outPath = join(process.cwd(), 'scripts', 'wines-backup.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✓ Exported ${data.length} wines to scripts/wines-backup.json`);
  console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
}

main();
