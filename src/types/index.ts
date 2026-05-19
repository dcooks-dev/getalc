export interface Wine {
  id: number;
  slug: string;
  display_name: string;
  producer: string;
  color: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified';
  sub_type: string;
  region: string;
  country: string;
  country_code: string;
  grapes: string[];
  description: string;
  description_long: string;
  pairing: string;
  pairing_long: string;
  tasting_notes: string;
  vintage: number;
  alcohol_pct: number;
  drinking_window_start: number;
  drinking_window_end: number;
  region_insights: string;
  aroma_profile: string[];
  sweetness: number;
  acidity: number;
  tannins: number;
  alcohol_intensity: number;
  body: number;
  finish: number;
  rating: number;
  review_count: number;
  image_url: string;
  food_pairings: string[];
  created_at: string;
  // Datafeedr enrichment
  product_url: string | null;
  price: number | null;
  original_price: number | null;
  original_currency: string | null;
  merchant_name: string | null;
  datafeedr_id: string | null;
  datafeedr_matched: boolean;
  match_confidence_score: number | null;
  needs_review: boolean;
}

export interface Beer {
  id: number;
  sku: string;
  slug: string;
  name: string;
  brewery: string;
  style: string;
  sub_style: string;
  country: string;
  region: string;
  description: string;
  tasting_notes: string;
  food_pairings: string[];
  suggested_glassware: string;
  serving_temp_f: string;
  serving_temp_c: string;
  abv: number;
  ibu: number;
  calories: number;
  carbs: number;
  beer_type: string;
  features: string;
  bitterness: number;
  sweetness: number;
  body: number;
  carbonation: number;
  aroma: number;
  finish: number;
  aroma_profile: string[];
  rating: number;
  review_count: number;
  image_url: string;
  created_at: string;
  // Datafeedr enrichment
  product_url: string | null;
  price: number | null;
  original_price: number | null;
  original_currency: string | null;
  merchant_name: string | null;
  datafeedr_id: string | null;
  datafeedr_matched: boolean;
  match_confidence_score: number | null;
  needs_review: boolean;
}

export type WineColor = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified';

export interface WineFilters {
  search: string;
  color: WineColor[];
  country: string[];
  region: string[];
  grape: string[];
  sweetness: [number, number];
  acidity: [number, number];
  tannins: [number, number];
  body: [number, number];
  alcohol: [number, number];
  rating: [number, number];
  drinkingNow: boolean;
  sortBy: 'rating' | 'name' | 'region' | 'alcohol';
  sortDir: 'asc' | 'desc';
}

export interface BeerFilters {
  search: string;
  style: string[];
  brewery: string[];
  country: string[];
  abv: [number, number];
  ibu: [number, number];
  rating: [number, number];
  sortBy: 'rating' | 'name' | 'abv' | 'ibu';
  sortDir: 'asc' | 'desc';
}
