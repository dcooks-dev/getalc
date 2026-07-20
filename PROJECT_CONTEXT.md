# GetAlc — Project context (read this first)

Premium **wine** discovery site (Vivino-style), beers & spirits "coming soon".
Live: https://my-first-project-gold-sigma.vercel.app · GitHub: `dcooks-dev/getalc` (branch `main`)
Supabase: https://dtsrjjicmvnrezdbxubd.supabase.co
Stack: Next.js 16 (Turbopack), TypeScript, Tailwind v4, Supabase, Vercel, Framer Motion.

## Data model
- **`wines_v2`** is the live table (`supabase/migrations/002_wines_v2.sql`, uuid PK, RLS public read).
  **56 complete unique wines.** Old `wines` (legacy Datafeedr) + `beers` tables are unused by the
  site and may be dropped (backed up to `scripts/legacy-*-backup.json`).
- Two sources per wine: **Awin** CSV `awin database.csv` (price, image, buy link — gitignored) +
  **Grapeminds API** (editorial, flavor, drinking window, region — see `GRAPEMINDS_API.md`).
- Website reads wines_v2 through the adapter **`src/lib/wines-v2.ts`** (maps a row → the `Wine`
  type; only surfaces `needs_reenrichment = false`). Detail pages route by the wines_v2 **uuid**.

## Pipeline scripts (in `scripts/`, run LOCALLY from the user's PowerShell)
`pipeline-100.ts`, `collect-complete.ts` (price-ranked seeder), `reenrich.ts`,
`check-db-batch.ts` (harvest, 5 unique wines/run), `check-wine.ts`, `license-wines.ts`.
- **Grapeminds enrichment is lazy**: the first fetch of a wine returns near-empty and *triggers*
  background AI generation; the data appears **~overnight**. Cadence = seed today → harvest
  tomorrow with `check-db-batch`. ~97% of wines are empty on first touch (not predictable by
  price/country — it's Grapeminds' internal state). Support contact: **Chris**.
- **Grapeminds is Cloudflare-IP-blocked from datacenter/sandbox IPs** and has abuse detection —
  scripts must run from the user's machine, paced (≥500ms), and STOP on "blocked"/"Suspicious".

## Buy links
Awin affiliate links (`awin1.com/pclick`, publisher `a=2913813`) are **inactive** ("This link is
now inactive"). The adapter uses the **direct merchant `product_url`** (wineonsale.com) which
works. To earn commission later: reactivate the Awin publisher account + Wine On Sale program,
then switch the Buy button back to `affiliate_url`.

## Design system
Light, inviting, **Vivino-inspired** (chosen over the original dark/gold/serif luxury look).
Tokens in `src/app/globals.css @theme`:
- Warm off-white bg `#FBF9F5`, white cards, **burgundy accent `#9B2D3A`**. NOTE: the `--color-gold*`
  tokens are **repointed to burgundy**, so existing `text-gold`/`bg-gold`/`border-gold` utilities
  render burgundy (kept the class names to avoid a mass rename).
- **Clean sans-serif** everywhere (Playfair serif removed; `--font-playfair-display` still defined
  in `layout.tsx` but unused). Pill buttons, softer shadows.
- Still wanted: more refinement (Vivino-style hero/search, bigger cards, a subtle gold micro-accent,
  warmer copy).

## Working agreements / gotchas (IMPORTANT)
- **NEVER run `next build` or delete `.next` while the user's `npm run dev` is running** — it
  corrupts the Turbopack cache and breaks their dev server (happened twice). Only edit source; let
  the **user** run and refresh locally. If Turbopack cache corrupts: stop dev, `Remove-Item
  -Recurse -Force .next`, `npm run dev`.
- **Pushing to GitHub needs the user's interactive auth** — the sandbox can't push. The user runs
  `git push origin main`, which triggers Vercel auto-deploy. Only commit/push when asked.
- **Supabase**: reachable from the sandbox for REST reads (service key in `.env.local`) but DNS is
  flaky at times; server components that fetch at build should `.catch()` a fallback.
- `.env.local` holds the anon + service keys (gitignored). Data files (awin CSV, `wines-export.*`,
  `scripts/*-backup*.json`, `collect-progress.json`) are gitignored.

## Status / next
- **Licensing not done yet** — `scripts/license-wines.ts` is ready (dry-run by default; `CONFIRM=1`
  to charge ~€21 for the 56, idempotent). Needs the Grapeminds PSL terms accepted (they are).
- Design refinement is ongoing per the user's feedback.
