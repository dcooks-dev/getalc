import { createClient } from '@supabase/supabase-js';
import type { Wine, Beer } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getFeaturedWines(limit = 8): Promise<Wine[]> {
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getFeaturedBeers(limit = 8): Promise<Beer[]> {
  const { data, error } = await supabase
    .from('beers')
    .select('*')
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getWines(filters: {
  search?: string;
  color?: string[];
  country?: string[];
  region?: string[];
  grape?: string;
  minSweetness?: number;
  maxSweetness?: number;
  minAcidity?: number;
  maxAcidity?: number;
  minTannins?: number;
  maxTannins?: number;
  minBody?: number;
  maxBody?: number;
  minAlcohol?: number;
  maxAlcohol?: number;
  minRating?: number;
  maxRating?: number;
  drinkingNow?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
} = {}): Promise<{ wines: Wine[]; count: number }> {
  let query = supabase.from('wines').select('*', { count: 'exact' });

  if (filters.search) {
    query = query.or(
      `display_name.ilike.%${filters.search}%,producer.ilike.%${filters.search}%,region.ilike.%${filters.search}%`
    );
  }
  if (filters.color?.length) query = query.in('color', filters.color);
  if (filters.country?.length) query = query.in('country', filters.country);
  if (filters.region?.length) query = query.in('region', filters.region);
  if (filters.grape) query = query.contains('grapes', [filters.grape]);
  if (filters.minSweetness !== undefined) query = query.gte('sweetness', filters.minSweetness);
  if (filters.maxSweetness !== undefined) query = query.lte('sweetness', filters.maxSweetness);
  if (filters.minAcidity !== undefined) query = query.gte('acidity', filters.minAcidity);
  if (filters.maxAcidity !== undefined) query = query.lte('acidity', filters.maxAcidity);
  if (filters.minTannins !== undefined) query = query.gte('tannins', filters.minTannins);
  if (filters.maxTannins !== undefined) query = query.lte('tannins', filters.maxTannins);
  if (filters.minBody !== undefined) query = query.gte('body', filters.minBody);
  if (filters.maxBody !== undefined) query = query.lte('body', filters.maxBody);
  if (filters.minRating !== undefined) query = query.gte('rating', filters.minRating);
  if (filters.maxRating !== undefined) query = query.lte('rating', filters.maxRating);
  if (filters.drinkingNow) {
    const year = new Date().getFullYear();
    query = query.lte('drinking_window_start', year).gte('drinking_window_end', year);
  }

  const sortBy = filters.sortBy ?? 'rating';
  const sortDir = filters.sortDir ?? 'desc';
  query = query.order(sortBy, { ascending: sortDir === 'asc' });

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { wines: data ?? [], count: count ?? 0 };
}

export async function getWineBySlug(slug: string): Promise<Wine | null> {
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

export async function getBeers(filters: {
  search?: string;
  style?: string[];
  brewery?: string[];
  country?: string[];
  minAbv?: number;
  maxAbv?: number;
  minIbu?: number;
  maxIbu?: number;
  minRating?: number;
  maxRating?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
} = {}): Promise<{ beers: Beer[]; count: number }> {
  let query = supabase.from('beers').select('*', { count: 'exact' });

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,brewery.ilike.%${filters.search}%,style.ilike.%${filters.search}%`
    );
  }
  if (filters.style?.length) query = query.in('style', filters.style);
  if (filters.brewery?.length) query = query.in('brewery', filters.brewery);
  if (filters.country?.length) query = query.in('country', filters.country);
  if (filters.minAbv !== undefined) query = query.gte('abv', filters.minAbv);
  if (filters.maxAbv !== undefined) query = query.lte('abv', filters.maxAbv);
  if (filters.minIbu !== undefined) query = query.gte('ibu', filters.minIbu);
  if (filters.maxIbu !== undefined) query = query.lte('ibu', filters.maxIbu);
  if (filters.minRating !== undefined) query = query.gte('rating', filters.minRating);
  if (filters.maxRating !== undefined) query = query.lte('rating', filters.maxRating);

  const sortBy = filters.sortBy ?? 'rating';
  const sortDir = filters.sortDir ?? 'desc';
  query = query.order(sortBy, { ascending: sortDir === 'asc' });

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { beers: data ?? [], count: count ?? 0 };
}

export async function getBeerBySlug(slug: string): Promise<Beer | null> {
  const { data, error } = await supabase
    .from('beers')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

export async function getWineFilterOptions(): Promise<{
  colors: string[];
  countries: string[];
  regions: string[];
  grapes: string[];
}> {
  const { data } = await supabase
    .from('wines')
    .select('color, country, region, grapes');

  const colors = [...new Set(data?.map((w) => w.color) ?? [])].sort();
  const countries = [...new Set(data?.map((w) => w.country) ?? [])].filter(Boolean).sort();
  const regions = [...new Set(data?.map((w) => w.region) ?? [])].filter(Boolean).sort();
  const grapes = [
    ...new Set(data?.flatMap((w) => w.grapes ?? []) ?? []),
  ].filter(Boolean).sort();

  return { colors, countries, regions, grapes };
}

export async function getBeerFilterOptions(): Promise<{
  styles: string[];
  breweries: string[];
  countries: string[];
}> {
  const { data } = await supabase
    .from('beers')
    .select('style, brewery, country');

  const styles = [...new Set(data?.map((b) => b.style) ?? [])].filter(Boolean).sort();
  const breweries = [...new Set(data?.map((b) => b.brewery) ?? [])].filter(Boolean).sort();
  const countries = [...new Set(data?.map((b) => b.country) ?? [])].filter(Boolean).sort();

  return { styles, breweries, countries };
}
