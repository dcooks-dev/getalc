# GetAlc — Complete Database Schema
*67 columns | wines table*

---

## Summary
| Source | Columns |
|---|---|
| Awin (direct from CSV) | 13 |
| Parsed from Awin description/name | 5 |
| Grapeminds API | 40 |
| AI fallback (only if Grapeminds null) | 2 |
| System/internal | 7 |
| **Total** | **67** |

---

## Product Identity (8 cols)
| Column | Source | Powers on website |
|---|---|---|
| `wine_name` | Parsed (Awin name) | Product title on card + detail page |
| `grapeminds_display_name` | Grapeminds | Canonical wine name — used when available |
| `vintage_year` | Parsed (Awin name) | Vintage badge on card top-right + stats block |
| `color` | Grapeminds | Red / White / Rosé badge on card |
| `sub_type` | Grapeminds | Still / Sparkling in stats block |
| `residual_sugar` | Grapeminds | Dry / Sweet descriptor on detail page |
| `wine_style_awin` | Parsed (Awin desc) | Fallback color label when Grapeminds null |
| `bottle_size_ml` | Parsed (Awin name) | Bottle size in stats (always 750ml) |

---

## Producer (5 cols)
| Column | Source | Powers on website |
|---|---|---|
| `producer_name` | Grapeminds | Winery name above wine title on card + detail |
| `producer_display_name` | Grapeminds | Full formal display name |
| `producer_title` | Grapeminds | Formal title (e.g. "Marchesi Antinori") |
| `producer_id` | Grapeminds | Future producer profile pages + filtering |
| `winery_name_awin` | Parsed (Awin desc) | Fallback producer name when Grapeminds null |

---

## Region (4 cols)
| Column | Source | Powers on website |
|---|---|---|
| `region_name` | Grapeminds | Region badge on detail page |
| `region_country` | Grapeminds | Country shown next to region + country filter |
| `region_id` | Grapeminds | Fetch region insights + future region pages |
| `country_region_awin` | Parsed (Awin desc) | Fallback region when Grapeminds null |

---

## Grapes (3 cols)
| Column | Source | Powers on website |
|---|---|---|
| `grapes` | Grapeminds | Grape variety chips on card + detail page |
| `grapes_json` | Grapeminds | Full array with IDs — grape filter on browse page |
| `grape_variety_awin` | Awin (model_number) | Fallback grape type when Grapeminds null |

---

## ABV (1 col)
| Column | Source | Powers on website |
|---|---|---|
| `abv` | Parsed (Awin desc) | ABV stat block — ONLY source, Grapeminds has no ABV |

---

## Editorial (7 cols)
All from Grapeminds. `winemaker_notes` is Awin fallback.
| Column | Source | Powers on website |
|---|---|---|
| `description` | Grapeminds | "About This Wine" section — short (~100 words) |
| `description_long` | Grapeminds | Extended description (~250 words) — "Read more" |
| `tasting_notes` | Grapeminds | Tasting Notes card — short (~100 words) |
| `tasting_notes_long` | Grapeminds | Extended tasting notes — expandable |
| `pairing` | Grapeminds | Food pairings — parsed for emoji chips |
| `pairing_long` | Grapeminds | Full food pairing text — expandable |
| `winemaker_notes` | Parsed (Awin desc) | Fallback editorial when Grapeminds null |

---

## Flavor Profile (6 cols)
All from Grapeminds (1–10 scale). Claude AI fills these only if Grapeminds returns null.
| Column | Source | Powers on website |
|---|---|---|
| `flavor_sweetness` | Grapeminds | Sweetness bar (gold fill) |
| `flavor_acidity` | Grapeminds | Acidity bar |
| `flavor_tannins` | Grapeminds | Tannins bar |
| `flavor_alcohol` | Grapeminds | Alcohol bar |
| `flavor_body` | Grapeminds | Body bar |
| `flavor_finish` | Grapeminds | Finish bar |

---

## Drinking Window (8 cols)
| Column | Source | Powers on website |
|---|---|---|
| `drinking_from_year` | Grapeminds + vintage | Left edge of drinking window slider (absolute year) |
| `drinking_to_year` | Grapeminds + vintage | Right edge of slider (absolute year) |
| `drinking_from_years` | Grapeminds | Relative years from vintage — stored for recomputing |
| `drinking_to_years` | Grapeminds | Relative years to vintage — stored for recomputing |
| `drinking_statement` | Grapeminds | Text below slider — drinking guidance paragraph |
| `drinking_young` | Grapeminds | Tasting notes when drunk young — expandable |
| `drinking_ripe` | Grapeminds | Tasting notes at peak maturity — expandable |
| `drinking_storage` | Grapeminds | Storage guidance ("Store at 12–15°C") |

---

## Region Insights (5 cols)
| Column | Source | Powers on website |
|---|---|---|
| `region_summary` | Grapeminds | Region Insights section — main overview |
| `region_climate` | Grapeminds | Climate and terroir description |
| `region_styles` | Grapeminds | Signature wine styles — chips or bullet list |
| `region_key_grapes` | Grapeminds | Key grapes of the region — chips |
| `region_key_grapes_json` | Grapeminds | Full array with IDs — cross-referencing |

---

## Commercial (11 cols)
All from Awin.
| Column | Source | Powers on website |
|---|---|---|
| `price` | Awin | Price shown on card and detail page (USD) |
| `rrp_price` | Awin | RRP — for "was / now" pricing if discounted |
| `currency` | Awin | Always USD for this catalogue |
| `image_url` | Awin | Bottle image on card + detail (high-res Shopify CDN) |
| `image_thumb_url` | Awin | Thumbnail (70x70) for search results |
| `product_url` | Awin | Direct non-affiliate link to Wine On Sale |
| `affiliate_url` | Awin | Buy Now button — your Awin publisher ID embedded |
| `in_stock` | Awin | Buy Now vs Sold Out button state |
| `stock_status` | Awin | "instock" / "soldout" availability label |
| `merchant_name` | Awin | "Wine On Sale" near buy button |
| `awin_product_id` | Awin | Awin product ID for feed re-syncing |

---

## System (7 cols)
| Column | Source | Purpose |
|---|---|---|
| `id` | System | UUID primary key — used in all page URLs (/wine/[id]) |
| `grapeminds_id` | Grapeminds | Wine ID for re-fetching, updating and licensing |
| `grapeminds_matched` | System | Did we find this wine in Grapeminds? |
| `grapeminds_licensed` | System | Have we paid €0.38 to license this wine? |
| `grapeminds_licensed_at` | System | Timestamp of license for billing reconciliation |
| `ai_enriched` | System | Were any fields filled by Claude AI instead of Grapeminds? |
| `created_at` | System | Record creation timestamp |
