/**
 * GetAlc Data Collection, Enrichment & Supabase Seed Script
 *
 * Run: npx tsx scripts/seed.ts
 * Requires SUPABASE_SERVICE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';
// Node.js 20 lacks native WebSocket — polyfill for Supabase realtime
(globalThis as any).WebSocket = WebSocket;
dotenv.config({ path: '.env.local' });

const GRAPEMINDS_KEY = process.env.GRAPEMINDS_API_KEY!;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY is missing from .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c').replace(/[ý]/g, 'y')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generateRating(min = 3.7, max = 4.7): number {
  return Math.round(randomBetween(min, max) * 10) / 10;
}

function generateReviewCount(): number {
  const r = Math.random();
  if (r < 0.5) return Math.floor(randomBetween(80, 500));
  if (r < 0.8) return Math.floor(randomBetween(500, 2000));
  return Math.floor(randomBetween(2000, 8000));
}

const COUNTRY_NAMES: Record<string, string> = {
  fr: 'France', it: 'Italy', es: 'Spain', de: 'Germany', pt: 'Portugal',
  ar: 'Argentina', us: 'United States', au: 'Australia', nz: 'New Zealand',
  cl: 'Chile', za: 'South Africa', at: 'Austria', hu: 'Hungary',
  gr: 'Greece', ro: 'Romania', bg: 'Bulgaria', hr: 'Croatia',
  si: 'Slovenia', rs: 'Serbia', md: 'Moldova', ge: 'Georgia',
  gb: 'United Kingdom', be: 'Belgium',
};

const WINE_IMAGES: Record<string, string> = {
  red: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
  white: 'https://images.unsplash.com/photo-1566275529824-cca6d008f3bf?w=800&q=80',
  rose: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  sparkling: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80',
  dessert: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
  fortified: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
};

const BEER_IMAGES: Record<string, string> = {
  light: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80',
  dark: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&q=80',
  craft: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=800&q=80',
};

// ─────────────────────────────────────────────────────────────
// WINE ENRICHMENT
// ─────────────────────────────────────────────────────────────

function alcoholPctFromScore(score: number, color: string): number {
  const base = color === 'sparkling' ? 10.5 : color === 'dessert' ? 11 : 12;
  const map: Record<number, number> = { 1: -3, 2: -2.5, 3: -1.5, 4: -0.5, 5: 0, 6: 0.5, 7: 1, 8: 1.5, 9: 2, 10: 3 };
  return Math.round((base + (map[score] ?? 0)) * 10) / 10;
}

function generateVintage(color: string, body: number, tannins: number): number {
  const currentYear = new Date().getFullYear();
  if (color === 'red' && body >= 7 && tannins >= 7) return currentYear - Math.floor(randomBetween(4, 10));
  if (color === 'red') return currentYear - Math.floor(randomBetween(2, 6));
  if (color === 'sparkling') return currentYear - Math.floor(randomBetween(2, 5));
  return currentYear - Math.floor(randomBetween(1, 4));
}

function generateDrinkingWindow(vintage: number, color: string, tannins: number, body: number, acidity: number) {
  const currentYear = new Date().getFullYear();
  let startOffset = 0;
  let windowLength = 3;
  if (color === 'red') {
    startOffset = tannins >= 8 ? 4 : tannins >= 5 ? 2 : 0;
    windowLength = tannins >= 8 ? 20 : tannins >= 5 ? 12 : 6;
  } else if (color === 'white') {
    startOffset = acidity >= 8 ? 2 : 0;
    windowLength = acidity >= 8 ? 12 : body >= 7 ? 8 : 4;
  } else if (color === 'sparkling') {
    startOffset = 0;
    windowLength = 5;
  } else if (color === 'dessert' || color === 'fortified') {
    startOffset = 2;
    windowLength = 20;
  } else {
    startOffset = 0;
    windowLength = 3;
  }
  const start = vintage + startOffset;
  const end = vintage + startOffset + windowLength;
  return { start: Math.max(start, currentYear - 2), end };
}

const GRAPE_AROMAS: Record<string, string[]> = {
  'Riesling': ['Lime', 'Green Apple', 'Petrol', 'White Flowers', 'Slate'],
  'Pinot Noir': ['Cherry', 'Raspberry', 'Violet', 'Earth', 'Forest Floor'],
  'Cabernet Sauvignon': ['Blackcurrant', 'Cedar', 'Dark Chocolate', 'Tobacco', 'Vanilla'],
  'Chardonnay': ['Apple', 'Butter', 'Vanilla', 'Hazelnut', 'Toast'],
  'Sauvignon Blanc': ['Grapefruit', 'Gooseberry', 'Grass', 'Lime', 'Passionfruit'],
  'Syrah': ['Blackberry', 'Pepper', 'Olive', 'Smoke', 'Violets'],
  'Shiraz': ['Blackberry', 'Pepper', 'Eucalyptus', 'Chocolate', 'Oak'],
  'Merlot': ['Plum', 'Dark Cherry', 'Chocolate', 'Cedar', 'Bay Leaf'],
  'Malbec': ['Dark Plum', 'Blackberry', 'Cocoa', 'Violet', 'Leather'],
  'Pinot Grigio': ['Pear', 'Apple', 'White Peach', 'Almond', 'Floral'],
  'Pinot Gris': ['Peach', 'Apricot', 'Honey', 'Rose', 'Spice'],
  'Gewurztraminer': ['Lychee', 'Rose', 'Ginger', 'Apricot', 'Turkish Delight'],
  'Nebbiolo': ['Tar', 'Rose', 'Cherry', 'Leather', 'Truffle'],
  'Sangiovese': ['Sour Cherry', 'Leather', 'Dried Herbs', 'Balsamic', 'Earth'],
  'Tempranillo': ['Leather', 'Dark Cherry', 'Vanilla', 'Earth', 'Tobacco'],
  'Grenache': ['Strawberry', 'Raspberry', 'White Pepper', 'Garrigue', 'Herbs'],
  'Viognier': ['Apricot', 'Peach', 'White Flowers', 'Spice', 'Honeysuckle'],
  'Grüner Veltliner': ['White Pepper', 'Citrus', 'Stone Fruit', 'Mineral', 'Herbs'],
  'Albariño': ['Citrus', 'Stone Fruit', 'Saline Mineral', 'White Flowers', 'Zest'],
  'Garnacha': ['Strawberry', 'Raspberry', 'Dried Herbs', 'Spice', 'Earth'],
};

const COLOR_AROMAS: Record<string, string[]> = {
  red: ['Dark Fruits', 'Earth', 'Spice', 'Oak', 'Leather'],
  white: ['Citrus', 'Stone Fruit', 'Floral', 'Mineral', 'Herb'],
  rose: ['Strawberry', 'Watermelon', 'Rose Petal', 'Citrus', 'Fresh Herbs'],
  sparkling: ['Apple', 'Pear', 'Brioche', 'Citrus Zest', 'Mineral'],
  dessert: ['Honey', 'Dried Apricot', 'Caramel', 'Orange Peel', 'Tropical'],
  fortified: ['Dried Fruit', 'Nuts', 'Caramel', 'Spice', 'Toast'],
};

function generateWineAromaProfile(grapes: string[], color: string): string[] {
  for (const grape of grapes) {
    for (const [key, aromas] of Object.entries(GRAPE_AROMAS)) {
      if (grape.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(grape.toLowerCase())) {
        return aromas.slice(0, 5);
      }
    }
  }
  return COLOR_AROMAS[color] ?? COLOR_AROMAS.red;
}

const REGION_INSIGHTS: Record<string, string> = {
  Alsace: 'Nestled between the Vosges mountains and the Rhine, Alsace is one of France\'s most distinctive wine regions. The mountains create a rain shadow effect, producing some of the driest conditions in France. The diversity of soils — granite, limestone, sandstone, and clay — combined with Germanic varieties grown in French style produces wines of remarkable intensity and aromatic complexity.',
  Burgundy: 'Burgundy is the spiritual home of Pinot Noir and Chardonnay, where the concept of terroir — the unique sense of place expressed in wine — was first articulated. The Côte d\'Or\'s narrow limestone ridge hosts some of the world\'s most coveted vineyards, from Grand Cru Chambertin to Montrachet. Centuries of monastic winemaking have refined these wines to their highest expression.',
  Bordeaux: 'Bordeaux sits at the confluence of the Garonne and Dordogne rivers, creating a temperate maritime climate ideal for Cabernet Sauvignon on the Left Bank\'s gravelly soils and Merlot on the Right Bank\'s clay-limestone. The classified growths system, established in 1855, remains the benchmark for fine wine globally. Great vintages combine power with elegance.',
  Champagne: 'Champagne\'s chalky soils, cool climate, and the méthode champenoise combine to create sparkling wines of unrivaled refinement. The region\'s 34,000 hectares of vineyards, planted primarily with Pinot Noir, Chardonnay, and Pinot Meunier, produce wines that balance richness with nervous acidity and extraordinary longevity.',
  Tuscany: 'Tuscany\'s rolling hills, cypress trees, and medieval hilltop towns provide the backdrop for some of Italy\'s greatest wines. The Sangiovese grape thrives in the Galestro and Alberese soils of Chianti Classico, while Brunello di Montalcino achieves its supreme expression on south-facing slopes above 500 meters. The Super Tuscans revolutionized Italian wine with bold international varieties.',
  Piedmont: 'In the fog-shrouded foothills of the Alps, Piedmont produces Italy\'s most structured and age-worthy wines. The Nebbiolo grape reaches its pinnacle in Barolo and Barbaresco, expressing flavors of tar, roses, and dried fruit with extraordinary tannin structure. The region\'s diversity extends to Barbera, Dolcetto, and the sparkling Moscato d\'Asti.',
  Rioja: 'Spain\'s most celebrated wine region stretches along the Ebro River valley, sheltered by the Sierra de Cantabria mountains. Tempranillo, the dominant grape, blends with Garnacha, Mazuelo, and Graciano to produce wines that are classically aged in American and French oak. The Rioja classification system — Crianza, Reserva, Gran Reserva — reflects minimum aging requirements that contribute to the style\'s characteristic vanilla and leather complexity.',
  Mendoza: 'Argentina\'s premier wine region sits at the foot of the Andes at altitudes between 600 and 1,500 meters. The high altitude, extreme temperature variation between day and night, and intense sunshine create ideal conditions for developing grape aromatics while preserving natural acidity. Malbec thrives here as nowhere else, producing wines of exceptional depth, violet aromatics, and velvety texture.',
  Napa: 'The Napa Valley\'s 60-kilometer stretch of valley floor and surrounding mountain elevations support a remarkable diversity of climates and soils. The valley\'s international reputation was established at the 1976 Paris Tasting, where California Cabernets beat their French counterparts. Today\'s wines balance opulent California fruit with increasing sophistication and terroir expression.',
  Mosel: 'The Mosel River\'s serpentine bends cut through some of the steepest vineyards in the world, carved from blue slate and red Devon sandstone. These dramatic slopes, angled to catch maximum sunlight in northern Germany\'s cool climate, produce Rieslings of ethereal delicacy — light in alcohol, crystalline in structure, and capable of aging for decades.',
  Barossa: 'Australia\'s most storied wine region, settled by German and Silesian immigrants in the 1840s, boasts some of the world\'s oldest Shiraz vines — many over 100 years old, growing on ancient soils. The dry continental climate produces intensely concentrated wines. Penfolds Grange, made largely from Barossa Shiraz, remains Australia\'s most iconic wine.',
  'Marlborough': 'At the top of New Zealand\'s South Island, Marlborough\'s sunny days, cool nights, and free-draining alluvial soils created the template for the world\'s most vivid Sauvignon Blancs. The region\'s Wairau and Awatere Valleys produce wines of electrifying intensity — all grapefruit, passion fruit, and freshly cut grass — that transformed New Zealand\'s international reputation.',
};

function generateRegionInsights(regionName: string, countryCode: string): string {
  for (const [key, insight] of Object.entries(REGION_INSIGHTS)) {
    if (regionName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(regionName.toLowerCase())) {
      return insight;
    }
  }
  const countryName = COUNTRY_NAMES[countryCode] ?? countryCode.toUpperCase();
  return `${regionName} is a distinguished wine-producing area in ${countryName}, known for its unique terroir and winemaking traditions. The region's climate, soils, and grape varieties combine to create wines of distinctive character and regional identity. Local winemakers have refined their craft over generations, producing wines that authentically express the land from which they come.`;
}

function generateWineTastingNotes(color: string, fp: any, grapes: string[], region: any): string {
  if (color === 'red') {
    if (fp.tannins >= 7 && fp.body >= 7) {
      return `Deeply concentrated with intense dark fruit character. The nose presents layers of blackcurrant, dark plum, and black cherry, accented by cedar, tobacco leaf, and earthy complexity. On the palate, the wine is powerful and structured with firm, well-integrated tannins that provide excellent backbone. Flavors of dark fruit, graphite, and warming spice develop across the mid-palate, leading to a long, savory finish with notes of dark chocolate and espresso. Built for the cellar.`;
    } else if (fp.tannins >= 4 && fp.body >= 4) {
      return `Expressive and approachable with generous ripe fruit character. The nose offers red and dark fruits — cherry, blackberry, and plum — alongside subtle oak influence of vanilla and cedar. The palate is round and supple with velvety tannins that provide structure without austerity. Mid-palate flavors of mocha, dried herbs, and a touch of minerality add complexity. The finish is warm and persistent.`;
    } else {
      return `Bright and elegant with vivid red berry character and fine, silky texture. Aromas of fresh cherry, raspberry, and strawberry are complemented by floral violet notes and a hint of spice. The palate is light-to-medium bodied with lively acidity and delicate tannins. Flavors of fresh red fruits persist through a clean, refreshing finish. Ideal for immediate enjoyment.`;
    }
  } else if (color === 'white') {
    if (fp.acidity >= 7) {
      return `Crystalline and precise with an aromatic nose of citrus zest, white peach, and green apple overlaid with distinctive mineral character. The palate is taut and focused, with electric acidity providing the backbone. Flavors of lime, wet stone, and subtle floral notes develop mid-palate, where the wine shows real depth and tension. The finish is long, saline, and mouth-watering — a hallmark of great white wine terroir.`;
    } else if (fp.body >= 7) {
      return `Richly textured and complex with opulent stone fruit and subtle oak influence. The nose presents ripe peach, mango, and cream alongside toasty vanilla and hazelnut. The palate is full-bodied and generous with glycerol richness and a creamy mouthfeel. Notes of butter, almond, and lemon curd complement the fruit profile, leading to a long, warming finish with excellent persistence.`;
    } else {
      return `Refreshing and aromatic with delicate citrus and floral notes. The nose is clean and expressive with apple blossom, pear, and a hint of herbs. The palate is medium-bodied and well-balanced with crisp acidity and flavors of white nectarine, lemon, and subtle mineral. A clean, zesty finish invites another sip.`;
    }
  } else if (color === 'rose') {
    return `Delicate and refreshing with a pale salmon-pink hue. The nose presents fresh strawberries, watermelon, rose petal, and a hint of citrus zest. On the palate, the wine is beautifully dry with lively, mouthwatering acidity. Flavors of raspberry, white peach, and fresh herbs glide through the mid-palate. The finish is clean, persistent, and wonderfully appetizing — quintessential rosé character.`;
  } else if (color === 'sparkling') {
    return `Elegant with fine, persistent bubbles and a pale golden color with green highlights. The nose is vibrant with fresh apple, pear, citrus zest, and delicate brioche. On the palate, the mousse is creamy and lifted, carrying flavors of crisp apple, lemon curd, and toasted almond bread. The finish is clean, mineral, and refreshing with excellent length — the very definition of celebratory wine.`;
  } else if (color === 'dessert') {
    return `Luxuriously sweet with incredible concentration and freshness. The nose is opulent with honeyed stone fruits — apricot, peach, and mango — alongside orange marmalade and saffron. The palate is luscious yet never cloying, with razor-sharp acidity providing lift and balance to the intense sweetness. Flavors of dried apricot, caramel, and exotic spice linger on an extraordinarily long finish.`;
  } else {
    return `Complex and contemplative with layers of dried fruit, nuts, and warming spirit. The nose presents prunes, figs, walnut, and toasted oak. The palate is rich and fortified with concentrated flavors of dark dried fruits, caramel, and a pleasantly oxidative note. The warming finish lingers for minutes, with a satisfying interplay of sweetness and spirit.`;
  }
}

// ─────────────────────────────────────────────────────────────
// BEER ENRICHMENT
// ─────────────────────────────────────────────────────────────

function getBeerImageUrl(style: string, subStyle: string): string {
  const s = (style + ' ' + subStyle).toLowerCase();
  if (s.includes('stout') || s.includes('porter') || s.includes('dark') || s.includes('brown')) return BEER_IMAGES.dark;
  if (s.includes('ipa') || s.includes('pale') || s.includes('saison') || s.includes('wheat') || s.includes('belgian')) return BEER_IMAGES.craft;
  return BEER_IMAGES.light;
}

function generateBeerFlavorProfile(style: string, abv: number, ibu: number): Record<string, number> {
  const s = style.toLowerCase();
  if (s.includes('double ipa') || s.includes('imperial ipa') || s.includes('triple ipa')) {
    return { bitterness: clamp(Math.round(ibu / 8), 7, 10), sweetness: 3, body: clamp(Math.round(abv), 5, 8), carbonation: 7, aroma: 9, finish: 8 };
  }
  if (s.includes('ipa') || s.includes('pale ale')) {
    return { bitterness: clamp(Math.round(ibu / 10), 5, 9), sweetness: 4, body: clamp(Math.round(abv / 1.5), 3, 7), carbonation: 7, aroma: 8, finish: 7 };
  }
  if (s.includes('stout')) {
    return { bitterness: clamp(Math.round(ibu / 12), 4, 8), sweetness: 7, body: 9, carbonation: 4, aroma: 9, finish: 8 };
  }
  if (s.includes('porter')) {
    return { bitterness: 6, sweetness: 6, body: 8, carbonation: 5, aroma: 8, finish: 7 };
  }
  if (s.includes('lager') || s.includes('pilsner') || s.includes('pilsener')) {
    return { bitterness: clamp(Math.round(ibu / 15), 2, 5), sweetness: 4, body: 3, carbonation: 9, aroma: 4, finish: 5 };
  }
  if (s.includes('wheat') || s.includes('weizen') || s.includes('hefeweizen')) {
    return { bitterness: 3, sweetness: 6, body: 5, carbonation: 7, aroma: 7, finish: 5 };
  }
  if (s.includes('belgian') || s.includes('dubbel') || s.includes('tripel') || s.includes('quadrupel')) {
    return { bitterness: 4, sweetness: 7, body: clamp(Math.round(abv / 1.2), 5, 9), carbonation: 6, aroma: 9, finish: 8 };
  }
  if (s.includes('saison') || s.includes('farmhouse')) {
    return { bitterness: 5, sweetness: 5, body: 5, carbonation: 8, aroma: 8, finish: 7 };
  }
  if (s.includes('sour') || s.includes('lambic') || s.includes('gose') || s.includes('berliner')) {
    return { bitterness: 2, sweetness: 3, body: 3, carbonation: 8, aroma: 7, finish: 6 };
  }
  if (s.includes('brown ale')) {
    return { bitterness: 4, sweetness: 7, body: 6, carbonation: 5, aroma: 6, finish: 6 };
  }
  if (s.includes('amber') || s.includes('red ale')) {
    return { bitterness: 5, sweetness: 6, body: 6, carbonation: 6, aroma: 6, finish: 6 };
  }
  if (s.includes('cream ale') || s.includes('blonde') || s.includes('golden')) {
    return { bitterness: 3, sweetness: 5, body: 4, carbonation: 7, aroma: 5, finish: 5 };
  }
  // Fallback
  return {
    bitterness: clamp(Math.round(ibu / 12), 2, 8),
    sweetness: Math.max(2, 6 - Math.round(ibu / 25)),
    body: clamp(Math.round(abv / 1.5), 3, 8),
    carbonation: 6, aroma: 6, finish: 6,
  };
}

const BEER_AROMAS: Record<string, string[]> = {
  ipa: ['Tropical Fruit', 'Pine Resin', 'Citrus Zest', 'Hop Flowers', 'Grapefruit'],
  double_ipa: ['Mango', 'Pineapple', 'Resinous Hops', 'Passion Fruit', 'Pine'],
  stout: ['Espresso', 'Dark Chocolate', 'Roasted Malt', 'Vanilla', 'Molasses'],
  porter: ['Coffee', 'Dark Chocolate', 'Caramel Malt', 'Smoked', 'Dried Fruit'],
  lager: ['Clean Grain', 'Floral Hops', 'Bread', 'Light Fruit', 'Crisp Malt'],
  wheat: ['Banana', 'Clove', 'Wheat Bread', 'Citrus', 'Yeast Spice'],
  belgian: ['Dried Fruit', 'Banana Ester', 'Clove', 'Caramel', 'Yeast Spice'],
  saison: ['Spicy Yeast', 'Citrus Zest', 'Pepper', 'Farmhouse', 'Earthy'],
  sour: ['Tart Stone Fruit', 'Lactic', 'Funk', 'Citrus', 'Wild Yeast'],
  brown: ['Hazelnut', 'Caramel', 'Brown Sugar', 'Toffee', 'Toasted Bread'],
  amber: ['Caramel Malt', 'Toasted Bread', 'Toffee', 'Light Citrus', 'Floral'],
  cream: ['Corn', 'Light Grain', 'Floral', 'Butter', 'Clean Malt'],
};

function generateBeerAromaProfile(style: string, subStyle: string): string[] {
  const s = (style + ' ' + subStyle).toLowerCase();
  if (s.includes('double ipa') || s.includes('imperial ipa') || s.includes('triple ipa')) return BEER_AROMAS.double_ipa;
  if (s.includes('ipa') || s.includes('pale ale')) return BEER_AROMAS.ipa;
  if (s.includes('stout')) return BEER_AROMAS.stout;
  if (s.includes('porter')) return BEER_AROMAS.porter;
  if (s.includes('lager') || s.includes('pilsn')) return BEER_AROMAS.lager;
  if (s.includes('wheat') || s.includes('weizen')) return BEER_AROMAS.wheat;
  if (s.includes('belgian') || s.includes('dubbel') || s.includes('tripel') || s.includes('quad')) return BEER_AROMAS.belgian;
  if (s.includes('saison') || s.includes('farmhouse')) return BEER_AROMAS.saison;
  if (s.includes('sour') || s.includes('lambic') || s.includes('gose')) return BEER_AROMAS.sour;
  if (s.includes('brown')) return BEER_AROMAS.brown;
  if (s.includes('amber') || s.includes('red')) return BEER_AROMAS.amber;
  if (s.includes('cream') || s.includes('blonde') || s.includes('golden')) return BEER_AROMAS.cream;
  return BEER_AROMAS.ipa;
}

function generateBeerTastingNotes(style: string, subStyle: string, description: string, abv: number, ibu: number): string {
  const s = (style + ' ' + subStyle).toLowerCase();

  if (s.includes('double ipa') || s.includes('imperial ipa') || s.includes('triple ipa')) {
    return `An assault of concentrated hop character from first pour to final sip. The nose is explosive with tropical fruit — mango, pineapple, passion fruit — layered with resinous pine and floral notes. The palate is bold and full-bodied, with a firm malt backbone that supports the intense bitterness without becoming harsh. Citrus oils coat the tongue as the beer warms, revealing deeper layers of stone fruit and herbal complexity. The finish is long, dry, and unapologetically bitter — the defining mark of a great Double IPA.`;
  }
  if (s.includes('ipa') || s.includes('pale ale')) {
    return `A vibrant, hop-forward expression with a clear, golden hue and frothy white head. The nose is inviting with fresh tropical and citrus hop aromas — grapefruit zest, tangerine, and a touch of pine. On the palate, a balanced malt backbone supports waves of hop flavor without tipping into harsh bitterness. The carbonation is lively, enhancing the clean, dry finish with a satisfying, lingering bitterness that invites another sip.`;
  }
  if (s.includes('stout')) {
    return `Jet black with a thick, creamy tan head that lingers to the last drop. The nose is immediately inviting — rich espresso, bittersweet dark chocolate, and subtle vanilla rise from the glass. The palate is full-bodied and velvety, with roasted coffee and dark chocolate notes complemented by hints of dried fruit and a whisper of vanilla sweetness. The roasty bitterness is perfectly calibrated, providing depth without astringency, and the finish is long, warming, and deeply satisfying.`;
  }
  if (s.includes('porter')) {
    return `Deep mahogany with ruby highlights and a persistent tan head. The nose opens with coffee, dark chocolate, and toffee, with a delicate smokiness in the background. On the palate, the body is medium-full and smooth, with flavors of roasted grain, bittersweet chocolate, and dried plum. The bitterness is restrained and balanced against the malt richness. The finish is clean and moderately dry, with a pleasant lingering coffee character.`;
  }
  if (s.includes('lager') || s.includes('pilsn')) {
    return `Brilliantly clear with a golden straw color and fine white head. The nose is clean and inviting with delicate malt sweetness, light grassy hops, and a hint of floral notes. The palate is crisp and refreshing, with light grain flavors, gentle bitterness, and a touch of honey sweetness. The carbonation is lively and invigorating. The finish is clean, dry, and thirst-quenching — everything a well-made lager should be.`;
  }
  if (s.includes('wheat') || s.includes('weizen') || s.includes('hefeweizen')) {
    return `Hazy, pale yellow with a frothy white head that fills the glass with the characteristic aromas of this classic style — banana, clove, and fresh-baked bread from the Bavarian yeast. On the palate, the beer is soft, pillowy, and refreshing with moderate carbonation. Flavors of wheat, citrus zest, and subtle yeast spice make this endlessly drinkable. The finish is clean, smooth, and gently warming.`;
  }
  if (s.includes('belgian') || s.includes('dubbel') || s.includes('tripel') || s.includes('quad') || s.includes('abbey')) {
    return `Complex and contemplative, this Belgian-inspired ale pours with a rich amber hue and a thick, rocky head. The nose is a symphony of fruity esters — dried figs, raisins, and banana — alongside spicy yeast notes of clove and pepper. On the palate, rich malt sweetness is beautifully balanced by moderate bitterness and warming alcohol. Stone fruit, caramel, and warming spice weave through the full-bodied palate. The finish is long, warming, and satisfyingly complex.`;
  }
  if (s.includes('saison') || s.includes('farmhouse')) {
    return `Rustic and refreshing with a hazy, pale golden appearance and a tall, rocky head. The nose is characteristically earthy and spicy — cracked pepper, lemon zest, and a hint of farmyard funkiness from the wild-type yeast. On the palate, the beer is dry and effervescent with flavors of citrus, grain, and herbal spice. The carbonation is vivid and cleansing. The dry, peppery finish is distinctive and refreshing.`;
  }
  if (s.includes('sour') || s.includes('lambic') || s.includes('gose') || s.includes('berliner')) {
    return `Bright and refreshing with a pale, hazy appearance and an immediately distinctive sour aroma. Lactic tartness, citrus, and a touch of funk create an inviting, complex nose. On the palate, the beer is bracingly sour with flavors of tart green apple, lemon, and a pleasantly funky character. The carbonation is lively, enhancing the mouthwatering acidity. The finish is clean, dry, and refreshing — endlessly thirst-quenching.`;
  }
  if (s.includes('brown ale')) {
    return `Warm amber-brown with a light tan head. The nose is inviting with aromas of toasted nuts, caramel, and a hint of chocolate. The palate is medium-bodied and smooth with flavors of hazelnuts, toffee, brown sugar, and gentle roasty notes. The bitterness is restrained, allowing the malt character to shine. The finish is clean and pleasantly sweet, with a lingering nutty warmth.`;
  }
  if (s.includes('amber') || s.includes('red ale')) {
    return `Beautiful clear amber with a persistent off-white head. The nose balances caramel malt sweetness with toasted bread and light hop florals. On the palate, the medium-bodied malt profile of toffee, caramel, and biscuit is complemented by moderate hop bitterness and subtle citrus notes. The finish is balanced and moderately dry — an excellent everyday craft beer.`;
  }
  if (s.includes('cream ale') || s.includes('blonde') || s.includes('golden')) {
    return `Light, refreshing, and effortlessly drinkable with a pale golden appearance and fine white head. The nose is clean with light grain, floral hops, and a touch of corn sweetness. The palate is smooth and approachable with gentle malt sweetness, low bitterness, and high carbonation that makes it wonderfully refreshing. The clean, slightly sweet finish is perfectly calibrated for easy drinking.`;
  }

  // Generic fallback using description hints
  return `A well-crafted example of ${style} with clear character and intent. The aroma is inviting and expressive, while the palate delivers ${ibu > 40 ? 'assertive bitterness balanced by malt character' : 'balanced flavors with approachable complexity'}. At ${abv}% ABV, the beer has ${abv > 8 ? 'notable warmth and body' : 'a refreshing, sessionable quality'}. The finish is ${ibu > 50 ? 'dry and bitter' : 'clean and balanced'}, leaving you reaching for another sip.`;
}

function parseAbv(abvStr: string): number {
  const match = abvStr?.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseIbu(ibuStr: string): number {
  return parseInt(ibuStr ?? '0', 10) || 0;
}

function parseCalories(calStr: string): number {
  return parseInt(calStr ?? '0', 10) || 0;
}

// ─────────────────────────────────────────────────────────────
// API FETCHERS
// ─────────────────────────────────────────────────────────────

async function fetchWithRetry(url: string, options: RequestInit, retries = 4): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const wait = 3000 * (attempt + 1);
      console.log(`  ⏳ Rate limited — waiting ${wait / 1000}s before retry ${attempt + 1}/${retries}...`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

async function safeJson(res: Response, label: string) {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('json')) {
    const text = await res.text();
    throw new Error(`${label} returned non-JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  return res.json();
}

async function fetchBreweryBeers(brewery: string): Promise<any[]> {
  await sleep(1000);
  const res = await fetchWithRetry(
    `https://beer9.p.rapidapi.com/?brewery=${encodeURIComponent(brewery)}`,
    {
      headers: {
        'x-rapidapi-host': 'beer9.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    }
  ).catch(() => null);
  if (!res || !res.ok) {
    console.warn(`  ⚠ Beer9 error for ${brewery}: ${res?.status ?? 'network error'}`);
    return [];
  }
  const json = await res.json();
  return json.data ?? [];
}

// ─────────────────────────────────────────────────────────────
// WINE SEEDING — static dataset, zero API calls
// ─────────────────────────────────────────────────────────────

interface StaticWine {
  id: number;
  display_name: string;
  producer: string;
  color: string;
  sub_type: string;
  region: string;
  country_code: string;
  grapes: string[];
  description: string;
  pairing: string;
  fp: { sweetness: number; acidity: number; tannins: number; alcohol: number; body: number; finish: number };
}

// 30 iconic wines covering 8 countries and 5 colors.
// IDs 2001–2030 avoid conflict with any real Grapeminds IDs we may have.
const STATIC_WINES: StaticWine[] = [
  // ── France Red ─────────────────────────────────────────────
  { id: 2001, display_name: 'Château Margaux', producer: 'Château Margaux', color: 'red', sub_type: 'Grand Cru Classé', region: 'Bordeaux', country_code: 'fr', grapes: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot'], description: 'The quintessential first growth, Château Margaux combines extraordinary power with unmatched finesse. The 2019 vintage showcases classic Margaux elegance — silky tannins, perfumed violet aromatics, and the signature grace of the appellation.', pairing: 'Roasted lamb, duck confit, aged beef, truffle dishes', fp: { sweetness: 2, acidity: 6, tannins: 8, alcohol: 7, body: 8, finish: 10 } },
  { id: 2002, display_name: 'Pichon Baron Pauillac', producer: 'Château Pichon Baron', color: 'red', sub_type: 'Deuxième Grand Cru Classé', region: 'Bordeaux', country_code: 'fr', grapes: ['Cabernet Sauvignon', 'Merlot'], description: 'A powerhouse of Pauillac — dark, concentrated, and built for the long haul. Cassis, graphite, and cedar define the nose while the palate shows the iron backbone of the finest Left Bank terroir.', pairing: 'Roast beef, lamb rack, venison, aged hard cheeses', fp: { sweetness: 2, acidity: 6, tannins: 9, alcohol: 7, body: 9, finish: 9 } },
  { id: 2003, display_name: 'Gevrey-Chambertin Vieilles Vignes', producer: 'Rossignol-Trapet', color: 'red', sub_type: 'Village', region: 'Burgundy', country_code: 'fr', grapes: ['Pinot Noir'], description: 'From old vines averaging 60 years in the heartland of Burgundy, this Gevrey-Chambertin combines the rustic earthiness of the village with remarkable elegance and complexity. Forest floor, cherry, and violet intertwine.', pairing: 'Roast chicken, duck, mushroom risotto, coq au vin', fp: { sweetness: 2, acidity: 7, tannins: 6, alcohol: 6, body: 6, finish: 8 } },
  { id: 2004, display_name: 'Crozes-Hermitage Syrah', producer: 'M. Chapoutier', color: 'red', sub_type: 'AOC', region: 'Rhône Valley', country_code: 'fr', grapes: ['Syrah'], description: 'From the granite slopes surrounding the legendary Hermitage hill, this Syrah displays the classic Northern Rhône profile: black olive, smoked meat, violet, and a peppery spice that sings of granite terroir.', pairing: 'Grilled lamb, game birds, beef stew, cured meats', fp: { sweetness: 2, acidity: 6, tannins: 7, alcohol: 7, body: 8, finish: 8 } },
  { id: 2005, display_name: 'Saint-Émilion Grand Cru', producer: 'Château Figeac', color: 'red', sub_type: 'Grand Cru Classé', region: 'Bordeaux', country_code: 'fr', grapes: ['Cabernet Franc', 'Merlot', 'Cabernet Sauvignon'], description: 'A Right Bank icon, Figeac is unusual for its high Cabernet Franc content on the gravel terroir near Pomerol. Aromatic and complex with pomegranate, tobacco leaf, and dried rose, it offers incomparable elegance and precision.', pairing: 'Lamb chops, duck breast, mushroom pasta, charcuterie', fp: { sweetness: 2, acidity: 7, tannins: 7, alcohol: 6, body: 7, finish: 9 } },

  // ── Italy Red ──────────────────────────────────────────────
  { id: 2006, display_name: 'Tignanello', producer: 'Marchesi Antinori', color: 'red', sub_type: 'Super Tuscan IGT', region: 'Tuscany', country_code: 'it', grapes: ['Sangiovese', 'Cabernet Sauvignon', 'Cabernet Franc'], description: 'The wine that changed Italian winemaking. Tignanello broke tradition by blending Sangiovese with Cabernet and aging in barriques — creating the blueprint for all Super Tuscans that followed. Intense, structured, and timeless.', pairing: 'Bistecca Fiorentina, wild boar, aged Pecorino, pasta with ragù', fp: { sweetness: 2, acidity: 7, tannins: 8, alcohol: 7, body: 9, finish: 9 } },
  { id: 2007, display_name: 'Barbaresco', producer: 'Gaja', color: 'red', sub_type: 'DOCG', region: 'Piedmont', country_code: 'it', grapes: ['Nebbiolo'], description: 'Angelo Gaja transformed Barbaresco into a global icon through uncompromising quality and visionary winemaking. Tar, roses, cherry liqueur, and leather define the nose while monumental tannin structure promises decades of evolution.', pairing: 'White truffle, osso buco, braised short rib, aged Parmigiano-Reggiano', fp: { sweetness: 1, acidity: 8, tannins: 9, alcohol: 7, body: 9, finish: 10 } },
  { id: 2008, display_name: 'Barolo Castiglione', producer: 'Vietti', color: 'red', sub_type: 'DOCG', region: 'Piedmont', country_code: 'it', grapes: ['Nebbiolo'], description: 'The King of Italian wines in its most approachable form. Vietti\'s Castiglione blends fruit from three Barolo villages to create a wine of complexity and completeness — dried roses, tar, cherry, and a tannin grip built for the table.', pairing: 'Braised veal, beef cheek, black truffle, aged Castelmagno', fp: { sweetness: 1, acidity: 8, tannins: 9, alcohol: 8, body: 9, finish: 9 } },

  // ── Spain Red ──────────────────────────────────────────────
  { id: 2009, display_name: 'Único', producer: 'Vega Sicilia', color: 'red', sub_type: 'Reserva Especial', region: 'Ribera del Duero', country_code: 'es', grapes: ['Tempranillo', 'Cabernet Sauvignon'], description: 'Spain\'s most celebrated wine and a legend in any language. Vega Sicilia Único spends a minimum of ten years in barrel and bottle before release, emerging as a wine of extraordinary complexity: sandalwood, dried cherry, vanilla, and iron.', pairing: 'Roast suckling pig, Iberian lamb, aged Manchego, venison', fp: { sweetness: 3, acidity: 6, tannins: 8, alcohol: 7, body: 9, finish: 10 } },
  { id: 2010, display_name: 'Muga Reserva', producer: 'Bodegas Muga', color: 'red', sub_type: 'Reserva', region: 'Rioja', country_code: 'es', grapes: ['Tempranillo', 'Garnacha', 'Mazuelo', 'Graciano'], description: 'A classic Rioja Reserva from one of the region\'s most traditional producers. Muga ages in both American and French oak, producing wines with trademark vanilla, leather, and red fruit complexity — approachable yet age-worthy.', pairing: 'Roasted lamb, chorizo, patatas brajas, manchego cheese', fp: { sweetness: 3, acidity: 6, tannins: 7, alcohol: 7, body: 7, finish: 8 } },

  // ── Argentina Red ──────────────────────────────────────────
  { id: 2011, display_name: 'Adrianna Vineyard Malbec', producer: 'Catena Zapata', color: 'red', sub_type: 'Single Vineyard', region: 'Mendoza', country_code: 'ar', grapes: ['Malbec'], description: 'From the Adrianna Vineyard at 1,500m in Gualtallary — considered Argentina\'s greatest wine-growing site. This Malbec achieves an impossible balance: the power of high-altitude Mendoza and the precision of cool-climate terroir. Exhilarating.', pairing: 'Argentine asado, rib eye steak, lamb chops, empanadas', fp: { sweetness: 3, acidity: 7, tannins: 8, alcohol: 8, body: 9, finish: 9 } },
  { id: 2012, display_name: 'Quimera', producer: 'Achaval-Ferrer', color: 'red', sub_type: 'Blend', region: 'Mendoza', country_code: 'ar', grapes: ['Malbec', 'Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'], description: 'A Médoc-inspired blend crafted from Mendoza\'s finest old vine parcels. Quimera combines the lush violet and plum fruit of Malbec with the structure of Cabernet and the roundness of Merlot into a seamlessly elegant whole.', pairing: 'Grilled beef, asado, roasted vegetables, mature cheeses', fp: { sweetness: 3, acidity: 6, tannins: 7, alcohol: 8, body: 8, finish: 8 } },
  { id: 2013, display_name: 'Gran Malbec', producer: 'Zuccardi Valle de Uco', color: 'red', sub_type: 'Valle de Uco', region: 'Mendoza', country_code: 'ar', grapes: ['Malbec'], description: 'From the Valle de Uco at over 1,200m, Zuccardi\'s Gran Malbec captures the mineral precision and freshness of high-altitude Mendoza. Deep violet, blackberry, and cocoa with a notably long, chalky finish.', pairing: 'Barbecued ribeye, lamb asado, chimichurri, blue cheese', fp: { sweetness: 2, acidity: 7, tannins: 7, alcohol: 8, body: 8, finish: 9 } },

  // ── Australia Red ──────────────────────────────────────────
  { id: 2014, display_name: 'Grange', producer: 'Penfolds', color: 'red', sub_type: 'Multi-regional Blend', region: 'Barossa Valley', country_code: 'au', grapes: ['Shiraz', 'Cabernet Sauvignon'], description: 'Australia\'s greatest wine and a benchmark for New World reds. Penfolds Grange is built from the finest Shiraz across South Australia — a monumental wine of extraordinary depth, chocolate, blackberry, and cedar with unmatched aging potential.', pairing: 'Wagyu beef, lamb rack, venison, bitter dark chocolate', fp: { sweetness: 2, acidity: 5, tannins: 8, alcohol: 9, body: 10, finish: 10 } },
  { id: 2015, display_name: 'The Dead Arm Shiraz', producer: "d'Arenberg", color: 'red', sub_type: 'Single Vineyard', region: 'McLaren Vale', country_code: 'au', grapes: ['Shiraz'], description: 'Named for the dead arm vine disease that concentrates flavors in affected vines, this legendary McLaren Vale Shiraz delivers extraordinary richness. Dark chocolate, espresso, blackberry jam, and leather with a velvety, generous mouthfeel.', pairing: 'BBQ ribs, slow-roasted lamb, dark chocolate, aged cheddar', fp: { sweetness: 3, acidity: 5, tannins: 7, alcohol: 9, body: 9, finish: 9 } },

  // ── United States Red ──────────────────────────────────────
  { id: 2016, display_name: 'Opus One', producer: 'Opus One Winery', color: 'red', sub_type: 'Proprietary Blend', region: 'Napa Valley', country_code: 'us', grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Malbec', 'Petit Verdot'], description: 'The benchmark for Napa Valley Bordeaux blends, created by Robert Mondavi and Baron Philippe de Rothschild. Opus One combines the power of Napa with the finesse of Bordeaux: cassis, dark chocolate, cedar, and an aristocratic structure.', pairing: 'Prime rib, rack of lamb, beef tenderloin, aged gouda', fp: { sweetness: 3, acidity: 6, tannins: 8, alcohol: 8, body: 9, finish: 9 } },
  { id: 2017, display_name: 'Monte Bello', producer: 'Ridge Vineyards', color: 'red', sub_type: 'Estate', region: 'Santa Cruz Mountains', country_code: 'us', grapes: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot'], description: 'Ridge\'s signature wine from the limestone ridge above Silicon Valley — the wine that finished second at the 1976 Paris Tasting. Monte Bello is cerebral and precise, with blackcurrant, tobacco, and an almost Bordeaux-like elegance.', pairing: 'Grilled leg of lamb, prime beef, duck confit, aged cheddar', fp: { sweetness: 2, acidity: 6, tannins: 8, alcohol: 7, body: 8, finish: 9 } },
  { id: 2018, display_name: 'Pinot Noir Sonoma Coast', producer: 'Kosta Browne', color: 'red', sub_type: 'Sonoma Coast', region: 'Sonoma', country_code: 'us', grapes: ['Pinot Noir'], description: 'Kosta Browne pioneered the hedonistic California Pinot style, sourcing from cool coastal vineyards influenced by Pacific fog and wind. Richly fruited yet fresh, with cherry cola, spice, and silky texture that made the winery cult famous.', pairing: 'Salmon, roast chicken, duck, mushroom risotto, brie', fp: { sweetness: 3, acidity: 6, tannins: 5, alcohol: 7, body: 6, finish: 7 } },

  // ── France White ───────────────────────────────────────────
  { id: 2019, display_name: 'Puligny-Montrachet', producer: 'Domaine Leflaive', color: 'white', sub_type: 'Village', region: 'Burgundy', country_code: 'fr', grapes: ['Chardonnay'], description: 'From Burgundy\'s greatest white wine village, Domaine Leflaive is the reference producer. Biodynamic farming yields Chardonnay of peerless minerality and precision — white flowers, hazelnut, lemon curd, and a chalky limestone backbone.', pairing: 'Lobster, scallops, sole meunière, poultry in cream sauce, brie', fp: { sweetness: 1, acidity: 8, tannins: 0, alcohol: 6, body: 7, finish: 9 } },
  { id: 2020, display_name: 'Riesling Clos Häuserer', producer: 'Zind-Humbrecht', color: 'white', sub_type: 'Vendanges Tardives', region: 'Alsace', country_code: 'fr', grapes: ['Riesling'], description: 'Alsace\'s most acclaimed estate coaxes Riesling to its greatest expression. The Clos Häuserer vineyard on limestone and marl soil produces a wine of electric intensity — petrol, lime zest, ginger, and a seemingly endless mineral finish.', pairing: 'Foie gras, spiced dishes, Thai cuisine, soft ripe cheese', fp: { sweetness: 4, acidity: 9, tannins: 0, alcohol: 6, body: 6, finish: 9 } },
  { id: 2021, display_name: 'Sancerre Blanc', producer: 'Henri Bourgeois', color: 'white', sub_type: 'AOC', region: 'Loire Valley', country_code: 'fr', grapes: ['Sauvignon Blanc'], description: 'The benchmark Sancerre, from one of the Loire Valley\'s most respected estates. On the famous Kimmeridgian chalk soils, Henri Bourgeois produces Sauvignon Blanc of extraordinary purity — grapefruit, grass, white flowers, and flint.', pairing: 'Goat cheese, oysters, grilled sea bass, vegetable tart, asparagus', fp: { sweetness: 1, acidity: 9, tannins: 0, alcohol: 6, body: 5, finish: 8 } },
  { id: 2022, display_name: 'Gewurztraminer Hengst Grand Cru', producer: 'Josmeyer', color: 'white', sub_type: 'Grand Cru', region: 'Alsace', country_code: 'fr', grapes: ['Gewurztraminer'], description: 'The Hengst Grand Cru on limestone and clay produces Gewurztraminer of opulent aromatic richness — lychee, rose petal, ginger, and Turkish delight rise from the glass in an almost exotic perfume. Full-bodied with a long, spiced finish.', pairing: 'Foie gras, Munster cheese, Thai curry, gingerbread, smoked salmon', fp: { sweetness: 5, acidity: 6, tannins: 0, alcohol: 7, body: 8, finish: 8 } },

  // ── Germany White ──────────────────────────────────────────
  { id: 2023, display_name: 'Wehlener Sonnenuhr Riesling Spätlese', producer: 'Dr. Loosen', color: 'white', sub_type: 'Spätlese', region: 'Mosel', country_code: 'de', grapes: ['Riesling'], description: 'From the Wehlener Sonnenuhr vineyard — one of Mosel\'s most celebrated sites — Dr. Loosen produces an ethereal Riesling of almost impossibly delicate balance. Crystalline lime, peach, and petrol aromas float over razor-sharp acidity and mineral slate.', pairing: 'Asian cuisine, crab, scallops, pork belly, blue cheese', fp: { sweetness: 5, acidity: 9, tannins: 0, alcohol: 4, body: 4, finish: 9 } },
  { id: 2024, display_name: 'Scharzhofberger Riesling Auslese', producer: 'Egon Müller', color: 'white', sub_type: 'Auslese', region: 'Mosel', country_code: 'de', grapes: ['Riesling'], description: 'One of the world\'s most expensive and collectible white wines, from the legendary Scharzhofberg vineyard on blue Devon slate. Liquid precision — the Auslese balances crystalline sweetness with electric acidity in a near-perfect equilibrium.', pairing: 'Seared foie gras, spicy Asian cuisine, fruit-based desserts, soft cheese', fp: { sweetness: 7, acidity: 10, tannins: 0, alcohol: 4, body: 5, finish: 10 } },
  { id: 2025, display_name: 'Grüner Veltliner Smaragd', producer: 'F.X. Pichler', color: 'white', sub_type: 'Smaragd', region: 'Wachau', country_code: 'at', grapes: ['Grüner Veltliner'], description: 'Austria\'s greatest white wine producer working with its finest native grape. F.X. Pichler\'s Smaragd reaches the pinnacle of what Grüner Veltliner can achieve: white pepper, citrus, stone fruit, and a rich, full-bodied texture with impeccable mineral acidity.', pairing: 'Wiener Schnitzel, crayfish, grilled white fish, aged Gouda', fp: { sweetness: 1, acidity: 8, tannins: 0, alcohol: 7, body: 7, finish: 8 } },

  // ── New Zealand White ──────────────────────────────────────
  { id: 2026, display_name: 'Sauvignon Blanc', producer: 'Cloudy Bay', color: 'white', sub_type: 'Marlborough', region: 'Marlborough', country_code: 'nz', grapes: ['Sauvignon Blanc'], description: 'The wine that put New Zealand on the global map. Cloudy Bay\'s Sauvignon Blanc remains the reference for Marlborough: passion fruit, grapefruit, freshly cut grass, and a vibrant acidity that makes every sip instantly refreshing.', pairing: 'Oysters, green salads, goat cheese, grilled fish, sushi', fp: { sweetness: 1, acidity: 9, tannins: 0, alcohol: 6, body: 4, finish: 7 } },

  // ── France Rosé ────────────────────────────────────────────
  { id: 2027, display_name: 'Whispering Angel', producer: "Château d'Esclans", color: 'rose', sub_type: 'Provence AOC', region: 'Provence', country_code: 'fr', grapes: ['Grenache', 'Cinsault', 'Rolle'], description: 'The wine that sparked the premium rosé revolution. Pale, elegant, and effortlessly sophisticated, Whispering Angel defined what modern Provence rosé could be — strawberry, peach, and floral notes with a silky, dry finish.', pairing: 'Seafood platter, grilled fish, Mediterranean salads, fresh goat cheese', fp: { sweetness: 2, acidity: 7, tannins: 2, alcohol: 6, body: 4, finish: 7 } },
  { id: 2028, display_name: 'Minuty Prestige', producer: 'Château Minuty', color: 'rose', sub_type: 'Provence AOC', region: 'Provence', country_code: 'fr', grapes: ['Grenache', 'Syrah', 'Cinsault'], description: 'One of the Côtes de Provence\'s oldest and most celebrated estates, producing rosé of distinctive minerality and freshness. The Prestige shows white peach, raspberry, and a herbal garrigue note with admirable depth for the style.', pairing: 'Bouillabaisse, grilled Mediterranean vegetables, charcuterie, ratatouille', fp: { sweetness: 2, acidity: 7, tannins: 2, alcohol: 6, body: 4, finish: 7 } },

  // ── France Sparkling ───────────────────────────────────────
  { id: 2029, display_name: 'Cristal', producer: 'Louis Roederer', color: 'sparkling', sub_type: 'Vintage Champagne', region: 'Champagne', country_code: 'fr', grapes: ['Pinot Noir', 'Chardonnay'], description: 'Originally created for Tsar Alexander II, Cristal remains the pinnacle of prestige Champagne. Roederer\'s finest vineyards, biodynamically farmed, produce a cuvée of extraordinary finesse: toasted brioche, ripe citrus, almond, and crystalline minerality.', pairing: 'Oysters, caviar, lobster thermidor, seared scallops', fp: { sweetness: 2, acidity: 8, tannins: 1, alcohol: 6, body: 6, finish: 9 } },
  { id: 2030, display_name: 'Special Cuvée Brut', producer: 'Bollinger', color: 'sparkling', sub_type: 'Non-Vintage Champagne', region: 'Champagne', country_code: 'fr', grapes: ['Pinot Noir', 'Chardonnay', 'Pinot Meunier'], description: 'Bollinger\'s house style — full-bodied, vinous, and complex — is on magnificent display in their flagship Special Cuvée. Extensive reserve wine use creates layers of toasted hazelnuts, apple compote, and brioche with remarkable depth for a non-vintage wine.', pairing: 'Grilled fish, fried chicken, mushroom risotto, aged comté', fp: { sweetness: 2, acidity: 7, tannins: 1, alcohol: 6, body: 6, finish: 8 } },
];

function buildWineRecord(w: StaticWine): object {
  const color = w.color;
  const fp = w.fp;
  const vintage = generateVintage(color, fp.body, fp.tannins);
  const alcoholPct = alcoholPctFromScore(fp.alcohol, color);
  const { start, end } = generateDrinkingWindow(vintage, color, fp.tannins, fp.body, fp.acidity);
  const country = COUNTRY_NAMES[w.country_code] ?? w.country_code.toUpperCase();
  const tastingNotes = generateWineTastingNotes(color, fp, w.grapes, { name: w.region });
  const regionInsights = generateRegionInsights(w.region, w.country_code);
  const aromaProfile = generateWineAromaProfile(w.grapes, color);
  const rating = generateRating(3.9, 4.8);
  const reviewCount = generateReviewCount();

  const foodPairings = w.pairing
    .replace(/\.$/, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 50)
    .slice(0, 6);

  return {
    id: w.id,
    slug: slugify(`${w.producer}-${w.display_name}-${w.id}`),
    display_name: w.display_name,
    producer: w.producer,
    color,
    sub_type: w.sub_type,
    region: w.region,
    country,
    country_code: w.country_code,
    grapes: w.grapes,
    description: w.description,
    description_long: w.description,
    pairing: w.pairing,
    pairing_long: w.pairing,
    tasting_notes: tastingNotes,
    vintage,
    alcohol_pct: alcoholPct,
    drinking_window_start: start,
    drinking_window_end: end,
    region_insights: regionInsights,
    aroma_profile: aromaProfile,
    sweetness: fp.sweetness,
    acidity: fp.acidity,
    tannins: fp.tannins,
    alcohol_intensity: fp.alcohol,
    body: fp.body,
    finish: fp.finish,
    rating,
    review_count: reviewCount,
    image_url: WINE_IMAGES[color] ?? WINE_IMAGES.red,
    food_pairings: foodPairings,
  };
}

async function seedWines() {
  console.log('\n🍷 Building wine records from static dataset...');
  console.log(`📋 ${STATIC_WINES.length} wines across 8 countries and 5 colors`);

  const wineRecords = STATIC_WINES.map((w) => {
    const record = buildWineRecord(w);
    console.log(`  ✓ ${w.display_name} — ${w.producer} (${w.country_code.toUpperCase()}, ${w.color})`);
    return record;
  });

  console.log(`\n💾 Inserting ${wineRecords.length} wines into Supabase...`);
  const { error } = await supabase.from('wines').upsert(wineRecords, { onConflict: 'id' });
  if (error) {
    console.error('❌ Wine insert error:', error);
  } else {
    console.log(`✅ Inserted ${wineRecords.length} wines`);
  }
}

// ─────────────────────────────────────────────────────────────
// BEER COLLECTION & SEEDING
// ─────────────────────────────────────────────────────────────

const BREWERIES = [
  'Sierra Nevada',
  'BrewDog',
  'Founders Brewing Company',
  'Dogfish Head',
  'Brooklyn Brewery',
  "Bell's Brewery",
  'Berkshire Brewing Company',
  'Chimay',
  'Duvel Moortgat',
  'Weihenstephan',
];

const BEERS_PER_BREWERY = 3;

async function seedBeers() {
  console.log('\n🍺 Starting beer collection...');
  const beerRecords: any[] = [];
  const usedSkus = new Set<string>();

  for (const brewery of BREWERIES) {
    console.log(`  Fetching ${brewery}...`);
    const beers = await fetchBreweryBeers(brewery);
    if (!beers.length) continue;

    // Pick diverse styles from each brewery
    const styleMap = new Map<string, any>();
    for (const b of beers) {
      const style = b.sub_category_2 || b.sub_category_1 || 'Ale';
      if (!styleMap.has(style) && !usedSkus.has(b.sku) && b.name && b.abv) {
        styleMap.set(style, b);
      }
    }

    const picked = [...styleMap.values()].slice(0, BEERS_PER_BREWERY);
    console.log(`    → picked ${picked.length} beers from ${brewery}`);

    for (const b of picked) {
      usedSkus.add(b.sku);
      const abv = parseAbv(b.abv);
      const ibu = parseIbu(b.ibu);
      const style = b.sub_category_2 || b.sub_category_1 || 'Ale';
      const subStyle = b.sub_category_3 || '';
      const fp = generateBeerFlavorProfile(style, abv, ibu);
      const aromaProfile = generateBeerAromaProfile(style, subStyle);
      const tastingNotes = generateBeerTastingNotes(style, subStyle, b.description, abv, ibu);
      const foodPairings = (b.food_pairing || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 2);
      const rating = generateRating(3.6, 4.8);
      const reviewCount = generateReviewCount();
      const imageUrl = getBeerImageUrl(style, subStyle);
      const slug = slugify(`${b.brewery}-${b.name}-${b.sku}`);

      beerRecords.push({
        sku: b.sku,
        slug,
        name: b.name,
        brewery: b.brewery,
        style,
        sub_style: subStyle,
        country: b.country || 'United States',
        region: b.region || '',
        description: b.description || '',
        tasting_notes: tastingNotes,
        food_pairings: foodPairings,
        suggested_glassware: b.suggested_glassware || '',
        serving_temp_f: b.serving_temp_f || '',
        serving_temp_c: b.serving_temp_c || '',
        abv,
        ibu,
        calories: parseCalories(b.calories_per_serving_12oz),
        carbs: parseFloat(b.carbs_per_serving_12oz) || 0,
        beer_type: b.beer_type || '',
        features: b.features || '',
        bitterness: fp.bitterness,
        sweetness: fp.sweetness,
        body: fp.body,
        carbonation: fp.carbonation,
        aroma: fp.aroma,
        finish: fp.finish,
        aroma_profile: aromaProfile,
        rating,
        review_count: reviewCount,
        image_url: imageUrl,
      });
    }
  }

  console.log(`\n💾 Inserting ${beerRecords.length} beers into Supabase...`);
  const { error } = await supabase.from('beers').upsert(beerRecords, { onConflict: 'sku' });
  if (error) {
    console.error('❌ Beer insert error:', error);
  } else {
    console.log(`✅ Inserted ${beerRecords.length} beers`);
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 GetAlc Seed Script Starting...\n');
  console.log('📡 Supabase:', SUPABASE_URL);

  await seedWines();

  console.log('\n✅ Seed complete! Your database is ready.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
