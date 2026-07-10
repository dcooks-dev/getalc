/**
 * wines_v2 data access + adapter.
 *
 * Maps a wines_v2 row into the existing `Wine` shape (plus optional extra
 * fields for the richer Grapeminds data) so the UI renders unchanged.
 * Only wines with needs_reenrichment = false are surfaced.
 *
 * Uses the shared anon Supabase client (never the service key in the browser).
 */

import { supabase } from './supabase';
import { getCountryName } from './utils';
import type { Wine } from '@/types';

interface WineV2Row {
  id: string;
  wine_name: string | null;
  grapeminds_display_name: string | null;
  producer_name: string | null;
  producer_title: string | null;
  producer_display_name: string | null;
  winery_name_awin: string | null;
  color: string | null;
  sub_type: string | null;
  residual_sugar: string | null;
  region_name: string | null;
  country_region_awin: string | null;
  region_country: string | null;
  grapes: string | null;
  description: string | null;
  description_long: string | null;
  pairing: string | null;
  pairing_long: string | null;
  tasting_notes: string | null;
  tasting_notes_long: string | null;
  vintage_year: number | null;
  abv: number | null;
  drinking_from_year: number | null;
  drinking_to_year: number | null;
  drinking_statement: string | null;
  drinking_young: string | null;
  drinking_ripe: string | null;
  drinking_storage: string | null;
  region_summary: string | null;
  region_climate: string | null;
  region_styles: string | null;
  region_key_grapes: string | null;
  flavor_sweetness: number | null;
  flavor_acidity: number | null;
  flavor_tannins: number | null;
  flavor_alcohol: number | null;
  flavor_body: number | null;
  flavor_finish: number | null;
  image_url: string | null;
  price: number | null;
  rrp_price: number | null;
  currency: string | null;
  merchant_name: string | null;
  product_url: string | null;
  affiliate_url: string | null;
  created_at: string;
}

const VALID_COLORS = ['red', 'white', 'rose', 'sparkling', 'dessert', 'fortified'] as const;
function normalizeColor(color: string | null, subType: string | null): Wine['color'] {
  const c = (color ?? '').toLowerCase();
  if ((subType ?? '').toLowerCase() === 'sparkling') return 'sparkling';
  if ((VALID_COLORS as readonly string[]).includes(c)) return c as Wine['color'];
  return 'red';
}

export function mapV2ToWine(r: WineV2Row): Wine {
  const grapes = (r.grapes ?? '').split(',').map((g) => g.trim()).filter(Boolean);
  return {
    id: 0,
    slug: r.id, // detail page routes by uuid
    display_name: r.grapeminds_display_name || r.wine_name || 'Unknown Wine',
    producer: r.producer_display_name || r.producer_name || r.winery_name_awin || '',
    color: normalizeColor(r.color, r.sub_type),
    sub_type: r.sub_type ?? '',
    region: r.region_name || r.country_region_awin || '',
    country: r.region_country ? getCountryName(r.region_country) : '',
    country_code: r.region_country ?? '',
    grapes,
    description: r.description ?? '',
    description_long: r.description_long ?? '',
    pairing: r.pairing ?? '',
    pairing_long: r.pairing_long ?? '',
    tasting_notes: r.tasting_notes ?? '',
    vintage: r.vintage_year ?? 0,
    alcohol_pct: r.abv ?? 0,
    drinking_window_start: r.drinking_from_year ?? 0,
    drinking_window_end: r.drinking_to_year ?? 0,
    region_insights: r.region_summary ?? '',
    aroma_profile: [],
    sweetness: r.flavor_sweetness ?? 0,
    acidity: r.flavor_acidity ?? 0,
    tannins: r.flavor_tannins ?? 0,
    alcohol_intensity: r.flavor_alcohol ?? 0,
    body: r.flavor_body ?? 0,
    finish: r.flavor_finish ?? 0,
    rating: 0,
    review_count: 0,
    image_url: r.image_url ?? '',
    food_pairings: [],
    created_at: r.created_at,
    // Prefer the direct merchant link — the Awin affiliate (pclick) links are
    // inactive until the Awin publisher account/program is live. Fall back to
    // the affiliate link only if no direct URL exists.
    product_url: r.product_url || r.affiliate_url,
    price: r.price,
    original_price: r.rrp_price,
    original_currency: r.currency,
    merchant_name: r.merchant_name,
    datafeedr_id: null,
    datafeedr_matched: false,
    match_confidence_score: null,
    needs_review: false,
    // ── Extra Grapeminds fields (optional on Wine) ──
    tasting_notes_long: r.tasting_notes_long ?? undefined,
    pairing_text: r.pairing ?? undefined,
    drinking_statement: r.drinking_statement ?? undefined,
    drinking_young: r.drinking_young ?? undefined,
    drinking_ripe: r.drinking_ripe ?? undefined,
    drinking_storage: r.drinking_storage ?? undefined,
    region_climate: r.region_climate ?? undefined,
    region_styles: r.region_styles ?? undefined,
    region_key_grapes: r.region_key_grapes ?? undefined,
    residual_sugar: r.residual_sugar ?? undefined,
    producer_title: r.producer_title ?? undefined,
  };
}

const currentYear = () => new Date().getFullYear();

export async function getWinesV2(filters: {
  search?: string;
  color?: string[];
  country?: string[];
  region?: string[];
  grape?: string;
  minSweetness?: number; maxSweetness?: number;
  minAcidity?: number; maxAcidity?: number;
  minTannins?: number; maxTannins?: number;
  minBody?: number; maxBody?: number;
  drinkingNow?: boolean;
  sortBy?: string; sortDir?: 'asc' | 'desc';
  limit?: number; offset?: number;
} = {}): Promise<{ wines: Wine[]; count: number }> {
  let query = supabase.from('wines_v2').select('*', { count: 'exact' }).eq('needs_reenrichment', false);

  if (filters.search) {
    query = query.or(
      `wine_name.ilike.%${filters.search}%,grapeminds_display_name.ilike.%${filters.search}%,producer_name.ilike.%${filters.search}%,region_name.ilike.%${filters.search}%`
    );
  }
  if (filters.color?.length) query = query.in('color', filters.color);
  if (filters.country?.length) query = query.in('region_country', filters.country);
  if (filters.region?.length) query = query.in('region_name', filters.region);
  if (filters.grape) query = query.ilike('grapes', `%${filters.grape}%`);
  if (filters.minSweetness !== undefined) query = query.gte('flavor_sweetness', filters.minSweetness);
  if (filters.maxSweetness !== undefined) query = query.lte('flavor_sweetness', filters.maxSweetness);
  if (filters.minAcidity !== undefined) query = query.gte('flavor_acidity', filters.minAcidity);
  if (filters.maxAcidity !== undefined) query = query.lte('flavor_acidity', filters.maxAcidity);
  if (filters.minTannins !== undefined) query = query.gte('flavor_tannins', filters.minTannins);
  if (filters.maxTannins !== undefined) query = query.lte('flavor_tannins', filters.maxTannins);
  if (filters.minBody !== undefined) query = query.gte('flavor_body', filters.minBody);
  if (filters.maxBody !== undefined) query = query.lte('flavor_body', filters.maxBody);
  if (filters.drinkingNow) {
    const y = currentYear();
    query = query.lte('drinking_from_year', y).gte('drinking_to_year', y);
  }

  const sortMap: Record<string, string> = {
    name: 'wine_name', region: 'region_name', alcohol: 'abv', price: 'price', created: 'created_at',
  };
  const sortBy = sortMap[filters.sortBy ?? 'price'] ?? 'price';
  const sortDir = filters.sortDir ?? 'desc';
  query = query.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { wines: (data ?? []).map((r) => mapV2ToWine(r as WineV2Row)), count: count ?? 0 };
}

export async function getWineByIdV2(id: string): Promise<Wine | null> {
  const { data, error } = await supabase.from('wines_v2').select('*').eq('id', id).single();
  if (error) return null;
  return mapV2ToWine(data as WineV2Row);
}

export async function getFeaturedWinesV2(limit = 8): Promise<Wine[]> {
  const { data, error } = await supabase
    .from('wines_v2').select('*').eq('needs_reenrichment', false)
    .order('price', { ascending: false, nullsFirst: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => mapV2ToWine(r as WineV2Row));
}

export async function getWineFilterOptionsV2(): Promise<{
  colors: string[]; countries: string[]; regions: string[]; grapes: string[];
}> {
  const { data } = await supabase
    .from('wines_v2').select('color, region_country, region_name, grapes').eq('needs_reenrichment', false);

  const colors = [...new Set(data?.map((w) => w.color) ?? [])].filter(Boolean).sort();
  // lowercase country codes (match DB values); UI renders them via getCountryName
  const countries = [...new Set(data?.map((w) => w.region_country) ?? [])].filter(Boolean).sort();
  const regions = [...new Set(data?.map((w) => w.region_name) ?? [])].filter(Boolean).sort();
  const grapes = [
    ...new Set(data?.flatMap((w) => (w.grapes ?? '').split(',').map((g: string) => g.trim())) ?? []),
  ].filter(Boolean).sort();

  return {
    colors: colors as string[], countries: countries as string[],
    regions: regions as string[], grapes: grapes as string[],
  };
}
