# Grapeminds Public API — Reference for Claude Code

Working notes for using the Grapeminds Public API in **this repo** (GetAlc / GrapeMinds wine site).
Covers every endpoint, the fields the official docs omit but the API actually returns, the
rate-limiting behaviour that trips abuse detection, and how the enrichment pipeline maps
Grapeminds data into Supabase.

> Sources: official API docs, `GrapeMinds-Public-API-v1.postman_collection.json` (in repo root),
> and the real usage in `scripts/pipeline-100.ts`. Fields marked **(observed)** appear in
> working code but are not in the published docs — treat as best-effort and null-guard them.

---

## 1. Fast facts

| Thing | Value |
|---|---|
| Base URL | `https://api.grapeminds.eu/public/v1` |
| Auth | `Authorization: Bearer <key>` **or** `X-API-Key: <key>` |
| API key (this repo) | `process.env.GRAPEMINDS_API_KEY` (in `.env.local`, git-ignored) |
| Languages | `de, en, es, fr, it, da` — via `Accept-Language` header or `lang` query param |
| Rate limit | Per-key, ~1200/min in practice. Watch `X-RateLimit-Remaining`; honour `Retry-After` on 429 |
| Dashboard | https://grapeminds.eu/api/dashboard (create keys, accept license terms) |

**Do not** commit the key. It already lives in `.env.local`; the pipeline loads it manually
(no `dotenv` needed) — see `scripts/pipeline-100.ts` top-of-file loader.

> Note: the API sits behind Cloudflare and appears to reject requests from datacenter/sandbox
> IPs (returns `403`/blocked with an empty body, distinct from a `401` auth failure). Run scripts
> that hit it from the user's machine, not from a CI sandbox.

---

## 2. Authentication

Every request needs the key in one of two headers (Bearer is what the pipeline uses):

```
Authorization: Bearer YOUR_API_KEY
```
```
X-API-Key: YOUR_API_KEY
```

Missing / invalid / revoked key → **401**.

---

## 3. Endpoints

### 3.1 `GET /wines` — list with filters

Query params: `page` (default 1), `per_page` (default 15, **max 100**), `color` (`red|white|rose`),
`sub_type` (`still|sparkling`), `producer_id`, `region_id`.

Returns `{ data: [...], meta: { current_page, last_page, per_page, total } }`. Each item is a
"summary" wine (id, display_name, color, type, sub_type, nested `producer`, nested `region`).
No editorial/flavor fields at list level — fetch the detail endpoint for those.

### 3.2 `GET /wines/search?q=…` — search by name/producer

Query params: `q` (**required, min 3 chars**), `limit` (default 20, max 100).
Returns `{ data: [{ id, display_name, color, producer_name }], meta: { query, count } }`.

**This is the entry point of the enrichment pipeline** — it searches by the parsed Awin wine name
and takes `data[0].id` as the match. If `q` < 3 chars it returns nothing; guard for that.

### 3.3 `GET /wines/{id}` — full detail (the important one)

Header: `Accept-Language: <lang>` localises `description`, `tasting_notes`, `pairing`, and
`region.name`. `flavor_profile` numbers are language-independent.

Documented fields: `id, display_name, color, type, sub_type, producer{id,name},
region{id,name,country,language}, grapes[{id,name}], description{text,text_long,language},
pairing{text,text_long,language}, tasting_notes{text,text_long,language},
flavor_profile{sweetness,acidity,tannins,alcohol,body,finish}`.

**Fields the pipeline reads that are NOT in the published docs — always null-guard:**

| Path | Notes |
|---|---|
| `producer.title` **(observed)** | e.g. "Marchesi Antinori" — formal title |
| `producer.display_name` **(observed)** | full formal producer name |
| `residual_sugar` **(observed)** | powers the Dry/Sweet descriptor |

`text` ≈ 100 words, `text_long` ≈ 250 words. `flavor_profile` values are on a **1–10** scale and
can be `null` for wines Grapeminds hasn't fully profiled — that's what triggers AI fallback and the
`needs_reenrichment` flag.

### 3.4 `GET /producers` and `GET /producers/{id}`

- `GET /producers` — params `search` (min 2 chars), `per_page` (max 100). Returns `{id,name}` list.
- `GET /producers/{id}?include_wines=1` — adds `wines[]` (id, display_name, color) and `wines_count`.

### 3.5 `GET /regions` and `GET /regions/{id}`

- `GET /regions` — params `country` (code), `search`; header `Accept-Language`. Returns
  `{id,name,country,language}`. `language` = the language the name is rendered in; `country` = where
  the region physically is.
- `GET /regions/{id}?include_wines=1` — adds `wines[]` and `wines_count`.

### 3.6 `GET /region-insights/{regionId}`

Param `lang` (or `Accept-Language`). Returns `summary`, `climate_and_terroir`,
`signature_styles[]` (strings), `key_grapes[{id,name}]`. The pipeline fetches this using
`wineData.region.id`, so it only runs when the wine detail has a region.

### 3.7 `GET /drinking-periods/{wineId}`

Param `lang` (or `Accept-Language`). Returns `from`, `to` (**years after vintage**, relative),
plus text: `statement`, `young`, `ripe`, `storage`.

**Convert to absolute years:** `drinking_from_year = vintage_year + from`,
`drinking_to_year = vintage_year + to`. Only compute when both `vintage_year` and the value are
non-null (the pipeline does exactly this).

### 3.8 Enterprise-only endpoints

- `POST /photo/analyze` **(Enterprise subscription)** — body
  `{ "photo": "data:image/jpeg;base64,…", "max_results": 5 }`, header
  `Accept-Language` (localises `residual_sugar` + region names). Returns matching wine candidates
  from a label photo. Not used by the current pipeline.
- `POST /licence/{wine_id}` — acquire a **Persistent Storage License** so a dataset can be stored
  permanently / used commercially. **Idempotent**: `201` on first license, `200` if already
  licensed (no double-charge). Requires an active subscription (`402` otherwise) and accepted PSL
  Terms in the dashboard (`403` otherwise). Each new license is a metered billing event
  (~€0.38/wine per repo notes). Tracked in Supabase via `grapeminds_licensed` /
  `grapeminds_licensed_at`.

---

## 4. Rate limiting & abuse avoidance

Response headers on every call: `X-RateLimit-Limit`, `X-RateLimit-Remaining`. On **429** you also
get `Retry-After` (seconds).

The pipeline's proven approach (`gmFetch` in `scripts/pipeline-100.ts`) — reuse it, don't reinvent:

1. **Global throttle** — never fire two requests closer than `MIN_REQUEST_GAP = 500ms`. This smooths
   the bursty "4 requests per wine" pattern (search + detail + drinking + region-insights) that
   otherwise trips Grapeminds' abuse detection.
2. **Proactive backoff** — when `X-RateLimit-Remaining < 20`, sleep 15s.
3. **429 handling** — sleep `Retry-After` seconds, then retry the same path.
4. **Block detection** — on a non-OK body containing `"blocked"` / `"Suspicious"`, **stop the whole
   run** and contact Grapeminds support; the key is being flagged. Do not hammer through it.
5. Fetch the 3 detail calls **sequentially**, not with `Promise.all`, so the global throttle can
   space them out.

---

## 5. Error responses

| Code | Meaning | Pipeline behaviour |
|---|---|---|
| 401 | No / invalid / expired key | fatal — fix the key |
| 404 | Resource not found | return `null`, treat as "no data" |
| 422 | Invalid params (e.g. `q` too short) | validate before calling |
| 429 | Rate limit exceeded | wait `Retry-After`, retry |
| 402 | No active subscription (license/photo) | enterprise gate |
| 403 | Blocked / terms not accepted / bad origin | stop; investigate |

---

## 6. How this repo uses the API

The enrichment flow lives in `scripts/pipeline-100.ts` (Awin CSV → Grapeminds → Supabase `wines_v2`).
Full column-by-column mapping is in `COMPLETE_DATABASE_SCHEMA.md`. In short:

```
Awin CSV row
  └─ parse name  → wine_name, vintage_year, bottle_size_ml
  └─ parse desc  → abv, wine_style_awin, winery_name_awin, country_region_awin, winemaker_notes
  │
  ├─ GET /wines/search?q={wine_name}         → match id (data[0].id)
  ├─ GET /wines/{id}                          → identity, producer, region, grapes,
  │                                             description/tasting/pairing (+long), flavor_profile
  ├─ GET /drinking-periods/{id}?lang=en       → drinking window (relative → absolute via vintage)
  └─ GET /region-insights/{region.id}?lang=en → region summary/climate/styles/key_grapes
        │
        └─ upsert into Supabase wines_v2 (Prefer: resolution=merge-duplicates)
```

Key conventions to preserve when extending:

- **Grapeminds is the source of truth** for ~40 columns; Awin-parsed values are only **fallbacks**
  used when Grapeminds returns null (see the "AI fallback" / `_awin` columns in the schema).
- **Null-tolerant matching** — a wine is inserted even with incomplete Grapeminds data.
  `checkMissing()` records which of `description, tasting_notes, pairing, grapes, flavor_profile,
  drinking_window, region_insights` are absent and sets `needs_reenrichment = true` for a later
  re-fetch pass. Don't reject partial matches.
- **`ai_enriched`** flags rows where Claude filled flavor/editorial gaps instead of Grapeminds.
- **IDs are stored as strings** in Supabase (`String(gmId)`, `String(producer.id)`, etc.).
- **Language**: the pipeline pins `Accept-Language: en` / `lang=en`. Change consistently across all
  four calls if localising.
- Store both `drinking_from_years/to_years` (relative) **and** `drinking_from_year/to_year`
  (absolute) so the window can be recomputed if the vintage changes.

### Minimal fetch helper (matches the repo's pattern)

```ts
const GM_BASE = 'https://api.grapeminds.eu/public/v1';
async function gm(path: string) {
  const res = await fetch(`${GM_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GRAPEMINDS_API_KEY!}`,
      'Accept-Language': 'en',
    },
  });
  if (res.status === 404) return null;
  if (res.status === 429) { /* sleep Retry-After, retry */ }
  if (!res.ok) return null;
  return res.json();
}
```

Run scripts from the user's machine (PowerShell), e.g. `npx tsx scripts/pipeline-100.ts`
(optionally `LIMIT=50 npx tsx …`). They are **not** runnable from a CI/sandbox IP due to the
Cloudflare origin block noted in §1.

---

## 7. Gotchas checklist

- [ ] `q` must be ≥ 3 chars for `/wines/search`; `search` ≥ 2 chars for `/producers`.
- [ ] `flavor_profile` fields can be `null` — always guard (`fp?.sweetness ?? null`).
- [ ] `producer.title`, `producer.display_name`, `residual_sugar` are observed-not-documented.
- [ ] Drinking `from`/`to` are **relative to vintage**, not absolute years.
- [ ] Region insights need `wineData.region.id`; skip the call if region is missing.
- [ ] Respect the 500ms global throttle + `Retry-After`; bail on "blocked"/"Suspicious".
- [ ] `/licence/{id}` is idempotent and **billed** — only license wines you intend to store.
- [ ] Never log or commit the API key.
