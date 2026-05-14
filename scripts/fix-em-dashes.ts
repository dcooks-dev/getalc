/**
 * One-shot script: removes all em dashes from wine/beer text fields in Supabase.
 * Run: npx tsx scripts/fix-em-dashes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';
(globalThis as any).WebSocket = WebSocket;
dotenv.config({ path: '.env.local' });

const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!key) throw new Error('No Supabase key found in .env.local');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);

// Ordered list of [old, new] replacements applied to every text field.
// Longer/more-specific strings first so they match before substrings do.
const REPLACEMENTS: Array<[string, string]> = [
  // ── Wine descriptions ──────────────────────────────────────────────────────
  [
    'classic Margaux elegance — silky tannins, perfumed violet aromatics, and the signature grace of the appellation.',
    'classic Margaux elegance, with silky tannins, perfumed violet aromatics, and the signature grace of the appellation.',
  ],
  [
    'A powerhouse of Pauillac — dark, concentrated, and built for the long haul.',
    'A powerhouse of Pauillac, dark, concentrated, and built for the long haul.',
  ],
  [
    'aging in barriques — creating the blueprint for all Super Tuscans that followed.',
    'aging in barriques, creating the blueprint for all Super Tuscans that followed.',
  ],
  [
    'to create a wine of complexity and completeness — dried roses, tar, cherry, and a tannin grip built for the table.',
    'to create a wine of complexity and completeness, offering dried roses, tar, cherry, and a tannin grip built for the table.',
  ],
  [
    'red fruit complexity — approachable yet age-worthy.',
    'red fruit complexity, approachable yet age-worthy.',
  ],
  [
    'at 1,500m in Gualtallary — considered Argentina\'s greatest wine-growing site.',
    'at 1,500m in Gualtallary, considered Argentina\'s greatest wine-growing site.',
  ],
  [
    'built from the finest Shiraz across South Australia — a monumental wine of extraordinary depth',
    'built from the finest Shiraz across South Australia, a monumental wine of extraordinary depth',
  ],
  [
    'the limestone ridge above Silicon Valley — the wine that finished second at the 1976 Paris Tasting.',
    'the limestone ridge above Silicon Valley, the wine that finished second at the 1976 Paris Tasting.',
  ],
  [
    'Biodynamic farming yields Chardonnay of peerless minerality and precision — white flowers, hazelnut, lemon curd, and a chalky limestone backbone.',
    'Biodynamic farming yields Chardonnay of peerless minerality and precision, with white flowers, hazelnut, lemon curd, and a chalky limestone backbone.',
  ],
  [
    'produces a wine of electric intensity — petrol, lime zest, ginger, and a seemingly endless mineral finish.',
    'produces a wine of electric intensity, with petrol, lime zest, ginger, and a seemingly endless mineral finish.',
  ],
  [
    'produces Sauvignon Blanc of extraordinary purity — grapefruit, grass, white flowers, and flint.',
    'produces Sauvignon Blanc of extraordinary purity, showing grapefruit, grass, white flowers, and flint.',
  ],
  [
    'produces Gewurztraminer of opulent aromatic richness — lychee, rose petal, ginger, and Turkish delight rise from the glass in an almost exotic perfume.',
    'produces Gewurztraminer of opulent aromatic richness, with lychee, rose petal, ginger, and Turkish delight rising from the glass in an almost exotic perfume.',
  ],
  [
    'From the Wehlener Sonnenuhr vineyard — one of Mosel\'s most celebrated sites — Dr. Loosen',
    'From the Wehlener Sonnenuhr vineyard, one of Mosel\'s most celebrated sites, Dr. Loosen',
  ],
  [
    'Liquid precision — the Auslese balances crystalline sweetness with electric acidity in a near-perfect equilibrium.',
    'Precision in liquid form, the Auslese balances crystalline sweetness with electric acidity in a near-perfect equilibrium.',
  ],
  [
    'Whispering Angel defined what modern Provence rosé could be — strawberry, peach, and floral notes with a silky, dry finish.',
    'Whispering Angel defined what modern Provence rosé could be, with strawberry, peach, and floral notes completing a silky, dry finish.',
  ],
  [
    'Bollinger\'s house style — full-bodied, vinous, and complex — is on magnificent display',
    'Bollinger\'s house style, full-bodied, vinous, and complex, is on magnificent display',
  ],

  // ── Region insights ────────────────────────────────────────────────────────
  [
    'The diversity of soils — granite, limestone, sandstone, and clay — combined with Germanic varieties grown in French style produces wines of remarkable intensity and aromatic complexity.',
    'The diversity of soils, including granite, limestone, sandstone, and clay, combined with Germanic varieties grown in French style produces wines of remarkable intensity and aromatic complexity.',
  ],
  [
    'where the concept of terroir — the unique sense of place expressed in wine — was first articulated.',
    'where the concept of terroir, the unique sense of place expressed in wine, was first articulated.',
  ],
  [
    'The Rioja classification system — Crianza, Reserva, Gran Reserva — reflects minimum aging requirements that contribute to the style\'s characteristic vanilla and leather complexity.',
    'The Rioja classification system, comprising Crianza, Reserva, and Gran Reserva, reflects minimum aging requirements that contribute to the style\'s characteristic vanilla and leather complexity.',
  ],
  [
    'produce Rieslings of ethereal delicacy — light in alcohol, crystalline in structure, and capable of aging for decades.',
    'produce Rieslings of ethereal delicacy, light in alcohol, crystalline in structure, and capable of aging for decades.',
  ],
  [
    'boasts some of the world\'s oldest Shiraz vines — many over 100 years old, growing on ancient soils.',
    'boasts some of the world\'s oldest Shiraz vines, many over 100 years old, growing on ancient soils.',
  ],
  [
    'produce wines of electrifying intensity — all grapefruit, passion fruit, and freshly cut grass — that transformed New Zealand\'s international reputation.',
    'produce wines of electrifying intensity, all grapefruit, passion fruit, and freshly cut grass, that transformed New Zealand\'s international reputation.',
  ],

  // ── Wine tasting note templates ────────────────────────────────────────────
  [
    'The nose offers red and dark fruits — cherry, blackberry, and plum — alongside subtle oak influence of vanilla and cedar.',
    'The nose offers red and dark fruits, including cherry, blackberry, and plum, alongside subtle oak influence of vanilla and cedar.',
  ],
  [
    'The finish is long, saline, and mouth-watering — a hallmark of great white wine terroir.',
    'The finish is long, saline, and mouth-watering, a hallmark of great white wine terroir.',
  ],
  [
    'The finish is clean, persistent, and wonderfully appetizing — quintessential rosé character.',
    'The finish is clean, persistent, and wonderfully appetizing, quintessential rosé character.',
  ],
  [
    'The finish is clean, mineral, and refreshing with excellent length — the very definition of celebratory wine.',
    'The finish is clean, mineral, and refreshing with excellent length, the very definition of celebratory wine.',
  ],
  [
    'The nose is opulent with honeyed stone fruits — apricot, peach, and mango — alongside orange marmalade and saffron.',
    'The nose is opulent with honeyed stone fruits, including apricot, peach, and mango, alongside orange marmalade and saffron.',
  ],

  // ── Beer tasting note templates ────────────────────────────────────────────
  [
    'The nose is explosive with tropical fruit — mango, pineapple, passion fruit — layered with resinous pine and floral notes.',
    'The nose is explosive with tropical fruit, including mango, pineapple, and passion fruit, layered with resinous pine and floral notes.',
  ],
  [
    'The finish is long, dry, and unapologetically bitter — the defining mark of a great Double IPA.',
    'The finish is long, dry, and unapologetically bitter, the defining mark of a great Double IPA.',
  ],
  [
    'The nose is inviting with fresh tropical and citrus hop aromas — grapefruit zest, tangerine, and a touch of pine.',
    'The nose is inviting with fresh tropical and citrus hop aromas, including grapefruit zest, tangerine, and a touch of pine.',
  ],
  [
    'The nose is immediately inviting — rich espresso, bittersweet dark chocolate, and subtle vanilla rise from the glass.',
    'The nose is immediately inviting, with rich espresso, bittersweet dark chocolate, and subtle vanilla rising from the glass.',
  ],
  [
    'The finish is clean, dry, and thirst-quenching — everything a well-made lager should be.',
    'The finish is clean, dry, and thirst-quenching, everything a well-made lager should be.',
  ],
  [
    'fills the glass with the characteristic aromas of this classic style — banana, clove, and fresh-baked bread from the Bavarian yeast.',
    'fills the glass with the characteristic aromas of this classic style, including banana, clove, and fresh-baked bread from the Bavarian yeast.',
  ],
  [
    'The nose is a symphony of fruity esters — dried figs, raisins, and banana — alongside spicy yeast notes of clove and pepper.',
    'The nose is a symphony of fruity esters, dried figs, raisins, and banana, alongside spicy yeast notes of clove and pepper.',
  ],
  [
    'The nose is characteristically earthy and spicy — cracked pepper, lemon zest, and a hint of farmyard funkiness from the wild-type yeast.',
    'The nose is characteristically earthy and spicy, with cracked pepper, lemon zest, and a hint of farmyard funkiness from the wild-type yeast.',
  ],
  [
    'The finish is clean, dry, and refreshing — endlessly thirst-quenching.',
    'The finish is clean, dry, and refreshing, endlessly thirst-quenching.',
  ],
  [
    'The finish is balanced and moderately dry — an excellent everyday craft beer.',
    'The finish is balanced and moderately dry, making it an excellent everyday craft beer.',
  ],
];

function applyReplacements(text: string | null): string | null {
  if (!text) return text;
  let result = text;
  for (const [old, next] of REPLACEMENTS) {
    result = result.split(old).join(next);
  }
  return result;
}

function hasEmDash(text: string | null): boolean {
  return !!text && text.includes('—');
}

async function fixWines() {
  console.log('\n🍷 Fetching all wines...');
  const { data: wines, error } = await supabase
    .from('wines')
    .select('id, description, description_long, tasting_notes, region_insights');

  if (error) { console.error('Error fetching wines:', error); return; }

  let updated = 0;
  for (const wine of wines ?? []) {
    const newDescription = applyReplacements(wine.description);
    const newDescriptionLong = applyReplacements(wine.description_long);
    const newTastingNotes = applyReplacements(wine.tasting_notes);
    const newRegionInsights = applyReplacements(wine.region_insights);

    const changed =
      newDescription !== wine.description ||
      newDescriptionLong !== wine.description_long ||
      newTastingNotes !== wine.tasting_notes ||
      newRegionInsights !== wine.region_insights;

    // Warn if an em dash remains after replacements (unexpected pattern from API or typo)
    for (const [field, val] of [
      ['description', newDescription],
      ['tasting_notes', newTastingNotes],
      ['region_insights', newRegionInsights],
    ] as const) {
      if (hasEmDash(val)) {
        console.warn(`  ⚠ Wine ${wine.id} still has — in ${field} after replacements`);
      }
    }

    if (!changed) continue;

    const { error: updateError } = await supabase
      .from('wines')
      .update({
        description: newDescription,
        description_long: newDescriptionLong,
        tasting_notes: newTastingNotes,
        region_insights: newRegionInsights,
      })
      .eq('id', wine.id);

    if (updateError) {
      console.error(`  ❌ Wine ${wine.id}:`, updateError.message);
    } else {
      console.log(`  ✓ Wine ${wine.id} updated`);
      updated++;
    }
  }
  console.log(`  → ${updated} wines updated`);
}

async function fixBeers() {
  console.log('\n🍺 Fetching all beers...');
  const { data: beers, error } = await supabase
    .from('beers')
    .select('sku, description, tasting_notes');

  if (error) { console.error('Error fetching beers:', error); return; }

  let updated = 0;
  for (const beer of beers ?? []) {
    const newDescription = applyReplacements(beer.description);
    const newTastingNotes = applyReplacements(beer.tasting_notes);

    const changed =
      newDescription !== beer.description ||
      newTastingNotes !== beer.tasting_notes;

    for (const [field, val] of [
      ['description', newDescription],
      ['tasting_notes', newTastingNotes],
    ] as const) {
      if (hasEmDash(val)) {
        console.warn(`  ⚠ Beer ${beer.sku} still has — in ${field} after replacements`);
      }
    }

    if (!changed) continue;

    const { error: updateError } = await supabase
      .from('beers')
      .update({ description: newDescription, tasting_notes: newTastingNotes })
      .eq('sku', beer.sku);

    if (updateError) {
      console.error(`  ❌ Beer ${beer.sku}:`, updateError.message);
    } else {
      console.log(`  ✓ Beer ${beer.sku} updated`);
      updated++;
    }
  }
  console.log(`  → ${updated} beers updated`);
}

async function main() {
  console.log('🔧 Fixing em dashes in Supabase...');
  await fixWines();
  await fixBeers();
  console.log('\n✅ Done.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
