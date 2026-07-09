-- Migration 002: Create wines_v2 table
-- This is the new schema for the Awin + Grapeminds pipeline.
-- The original `wines` table is left untouched (existing data preserved).
-- Once the new pipeline is live and verified, wines_v2 will be renamed to wines.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dtsrjjicmvnrezdbxubd/sql

-- ============================================================
-- NEW WINES TABLE (v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS wines_v2 (

  -- ── System ───────────────────────────────────────────────
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  grapeminds_matched        boolean     NOT NULL DEFAULT false,
  grapeminds_licensed       boolean     NOT NULL DEFAULT false,
  grapeminds_licensed_at    timestamptz,
  ai_enriched               boolean     NOT NULL DEFAULT false,

  -- ── Awin — product identity ───────────────────────────────
  awin_product_id           text        NOT NULL UNIQUE,  -- aw_product_id in CSV
  merchant_sku              text,                         -- merchant_product_id in CSV
  merchant_name             text,
  in_stock                  boolean,
  stock_status              text,                         -- "instock" / "soldout"

  -- ── Awin — commercial ────────────────────────────────────
  price                     decimal(10,2),
  rrp_price                 decimal(10,2),
  currency                  text,
  image_url                 text,                         -- merchant_image_url (Shopify CDN)
  image_thumb_url           text,                         -- aw_thumb_url (70x70)
  product_url               text,                         -- merchant_deep_link (non-affiliate)
  affiliate_url             text,                         -- aw_deep_link (publisher ID embedded)

  -- ── Parsed from Awin product_name ────────────────────────
  -- e.g. "19 Crimes Martha's Chardonnay 2021 - 750 ML"
  wine_name                 text,
  vintage_year              integer,
  bottle_size_ml            integer,

  -- ── Parsed from Awin description field ───────────────────
  abv                       decimal(5,2),
  wine_style_awin           text,
  winery_name_awin          text,
  country_region_awin       text,
  grape_variety_awin        text,                         -- model_number field in CSV
  winemaker_notes           text,
  description_raw           text,                         -- full raw description for debugging

  -- ── Grapeminds — identity (/wines/{id}) ──────────────────
  grapeminds_id             text        UNIQUE,
  grapeminds_display_name   text,
  color                     text,                         -- "Red" / "White" / "Rosé"
  sub_type                  text,                         -- "Still" / "Sparkling"
  residual_sugar            text,                         -- null for many wines; present in real API response

  -- ── Grapeminds — producer ────────────────────────────────
  -- Real API response: { id, name, title, display_name } — docs show simplified version only
  producer_id               text,
  producer_name             text,
  producer_title            text,                         -- null for many wines
  producer_display_name     text,

  -- ── Grapeminds — region ──────────────────────────────────
  region_id                 text,
  region_name               text,
  region_country            text,

  -- ── Grapeminds — grapes ──────────────────────────────────
  grapes                    text,                         -- "Cabernet Sauvignon, Merlot" (display string)
  grapes_json               jsonb,                        -- [{"id": 1, "name": "Cabernet Sauvignon"}, ...]

  -- ── Grapeminds — editorial ───────────────────────────────
  description               text,
  description_long          text,
  tasting_notes             text,
  tasting_notes_long        text,
  pairing                   text,
  pairing_long              text,

  -- ── Grapeminds — flavor profile (1–10 scale) ─────────────
  flavor_sweetness          integer,
  flavor_acidity            integer,
  flavor_tannins            integer,
  flavor_alcohol            integer,
  flavor_body               integer,
  flavor_finish             integer,

  -- ── Grapeminds — drinking window (/drinking-periods/{id}) ─
  drinking_from_years       integer,                      -- relative offset from vintage (e.g. 2)
  drinking_to_years         integer,                      -- relative offset from vintage (e.g. 10)
  drinking_from_year        integer,                      -- absolute: vintage_year + from
  drinking_to_year          integer,                      -- absolute: vintage_year + to
  drinking_statement        text,
  drinking_young            text,
  drinking_ripe             text,
  drinking_storage          text,

  -- ── Grapeminds — region insights (/region-insights/{id}) ──
  region_summary            text,
  region_climate            text,
  region_styles             text,                         -- joined display string
  region_styles_json        jsonb,                        -- ["Chianti (Sangiovese-betont)", "Brunello di Montalcino", ...]
  region_key_grapes         text,                         -- "Pinot Noir, Chardonnay" (display string)
  region_key_grapes_json    jsonb,                        -- [{"id": 5, "name": "Pinot Noir"}, ...]

  -- ── Pipeline tracking ────────────────────────────────────
  needs_reenrichment        boolean     NOT NULL DEFAULT false  -- true when Grapeminds returned nulls on first fetch

);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS wines_v2_color_idx               ON wines_v2 (color);
CREATE INDEX IF NOT EXISTS wines_v2_region_country_idx      ON wines_v2 (region_country);
CREATE INDEX IF NOT EXISTS wines_v2_in_stock_idx            ON wines_v2 (in_stock);
CREATE INDEX IF NOT EXISTS wines_v2_vintage_year_idx        ON wines_v2 (vintage_year);
CREATE INDEX IF NOT EXISTS wines_v2_price_idx               ON wines_v2 (price);
CREATE INDEX IF NOT EXISTS wines_v2_grapeminds_matched_idx  ON wines_v2 (grapeminds_matched);
CREATE INDEX IF NOT EXISTS wines_v2_grapeminds_licensed_idx ON wines_v2 (grapeminds_licensed);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wines_v2_updated_at ON wines_v2;
CREATE TRIGGER wines_v2_updated_at
  BEFORE UPDATE ON wines_v2
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE wines_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public wines_v2 read" ON wines_v2;
CREATE POLICY "Public wines_v2 read" ON wines_v2 FOR SELECT USING (true);

-- ============================================================
-- WHEN READY TO SWITCH OVER:
-- (run this only after pipeline is verified and website updated)
--
--   ALTER TABLE wines RENAME TO wines_legacy;
--   ALTER TABLE wines_v2 RENAME TO wines;
--   ALTER INDEX wines_v2_color_idx               RENAME TO wines_color_idx;
--   ALTER INDEX wines_v2_region_country_idx      RENAME TO wines_region_country_idx;
--   ALTER INDEX wines_v2_in_stock_idx            RENAME TO wines_in_stock_idx;
--   ALTER INDEX wines_v2_vintage_year_idx        RENAME TO wines_vintage_year_idx;
--   ALTER INDEX wines_v2_price_idx               RENAME TO wines_price_idx;
--   ALTER INDEX wines_v2_grapeminds_matched_idx  RENAME TO wines_grapeminds_matched_idx;
--   ALTER INDEX wines_v2_grapeminds_licensed_idx RENAME TO wines_grapeminds_licensed_idx;
--   ALTER TRIGGER wines_v2_updated_at ON wines RENAME TO wines_updated_at;
-- ============================================================
