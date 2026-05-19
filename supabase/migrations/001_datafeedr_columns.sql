-- Migration 001: Add Datafeedr enrichment columns
-- Run in Supabase SQL Editor before running scripts/datafeedr-match.ts
-- All columns use IF NOT EXISTS so the migration is safe to re-run.

ALTER TABLE wines ADD COLUMN IF NOT EXISTS product_url            text;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS price                  numeric(10,2);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS original_price         numeric(10,2);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS original_currency      text;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS merchant_name          text;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS datafeedr_id           text;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS datafeedr_matched      boolean DEFAULT false;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS match_confidence_score integer;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS needs_review           boolean DEFAULT false;

ALTER TABLE beers ADD COLUMN IF NOT EXISTS product_url            text;
ALTER TABLE beers ADD COLUMN IF NOT EXISTS price                  numeric(10,2);
ALTER TABLE beers ADD COLUMN IF NOT EXISTS original_price         numeric(10,2);
ALTER TABLE beers ADD COLUMN IF NOT EXISTS original_currency      text;
ALTER TABLE beers ADD COLUMN IF NOT EXISTS merchant_name          text;
ALTER TABLE beers ADD COLUMN IF NOT EXISTS datafeedr_id           text;
ALTER TABLE beers ADD COLUMN IF NOT EXISTS datafeedr_matched      boolean DEFAULT false;
ALTER TABLE beers ADD COLUMN IF NOT EXISTS match_confidence_score integer;
ALTER TABLE beers ADD COLUMN IF NOT EXISTS needs_review           boolean DEFAULT false;
