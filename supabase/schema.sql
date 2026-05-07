-- GetAlc Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/dtsrjjicmvnrezdbxubd/sql

-- Wines table
create table if not exists wines (
  id bigint primary key,
  slug text unique not null,
  display_name text not null,
  producer text,
  color text,
  sub_type text,
  region text,
  country text,
  country_code text,
  grapes text[],
  description text,
  description_long text,
  pairing text,
  pairing_long text,
  tasting_notes text,
  vintage integer,
  alcohol_pct numeric(4,1),
  drinking_window_start integer,
  drinking_window_end integer,
  region_insights text,
  aroma_profile text[],
  sweetness integer,
  acidity integer,
  tannins integer,
  alcohol_intensity integer,
  body integer,
  finish integer,
  rating numeric(3,1),
  review_count integer,
  image_url text,
  food_pairings text[],
  created_at timestamptz default now()
);

-- Beers table
create table if not exists beers (
  id serial primary key,
  sku text unique,
  slug text unique not null,
  name text not null,
  brewery text,
  style text,
  sub_style text,
  country text,
  region text,
  description text,
  tasting_notes text,
  food_pairings text[],
  suggested_glassware text,
  serving_temp_f text,
  serving_temp_c text,
  abv numeric(5,2),
  ibu integer,
  calories integer,
  carbs numeric(5,1),
  beer_type text,
  features text,
  bitterness integer,
  sweetness integer,
  body integer,
  carbonation integer,
  aroma integer,
  finish integer,
  aroma_profile text[],
  rating numeric(3,1),
  review_count integer,
  image_url text,
  created_at timestamptz default now()
);

-- Indexes for fast filtering
create index if not exists wines_color_idx on wines(color);
create index if not exists wines_region_idx on wines(region);
create index if not exists wines_country_idx on wines(country);
create index if not exists wines_rating_idx on wines(rating desc);
create index if not exists wines_slug_idx on wines(slug);
create index if not exists wines_vintage_idx on wines(vintage);

create index if not exists beers_style_idx on beers(style);
create index if not exists beers_brewery_idx on beers(brewery);
create index if not exists beers_country_idx on beers(country);
create index if not exists beers_rating_idx on beers(rating desc);
create index if not exists beers_slug_idx on beers(slug);

-- Row Level Security (read-only for public)
alter table wines enable row level security;
alter table beers enable row level security;

drop policy if exists "Public wines read" on wines;
drop policy if exists "Public beers read" on beers;

create policy "Public wines read" on wines for select using (true);
create policy "Public beers read" on beers for select using (true);
