'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWines } from '@/lib/supabase';
import { WineCard } from '@/components/products/product-card';
import type { Wine } from '@/types';
import { WINE_COLOR_LABELS, cn } from '@/lib/utils';

interface Props {
  filterOptions: {
    colors: string[];
    countries: string[];
    regions: string[];
    grapes: string[];
  };
  filterError?: boolean;
}

const SORT_OPTIONS = [
  { value: 'rating-desc', label: 'Top Rated' },
  { value: 'rating-asc', label: 'Lowest Rated' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'alcohol_pct-desc', label: 'Highest ABV' },
  { value: 'alcohol_pct-asc', label: 'Lowest ABV' },
];

function RangeSlider({
  label, min, max, value, onChange, step = 1, suffix = '',
}: {
  label: string; min: number; max: number; value: [number, number];
  onChange: (v: [number, number]) => void; step?: number; suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs text-text-secondary">
          {value[0]}{suffix} – {value[1]}{suffix}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min} max={max} step={step}
          value={value[0]}
          onChange={(e) => onChange([+e.target.value, value[1]])}
          className="flex-1 accent-gold h-1"
        />
        <input
          type="range"
          min={min} max={max} step={step}
          value={value[1]}
          onChange={(e) => onChange([value[0], +e.target.value])}
          className="flex-1 accent-gold h-1"
        />
      </div>
    </div>
  );
}

function FilterSection({
  title, children, defaultOpen = true,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-xs uppercase tracking-[0.15em] text-text-secondary">{title}</span>
        {open ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WineBrowseClient({ filterOptions, filterError }: Props) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [grapes, setGrapes] = useState<string[]>([]);
  const [sweetness, setSweetness] = useState<[number, number]>([1, 10]);
  const [acidity, setAcidity] = useState<[number, number]>([1, 10]);
  const [tannins, setTannins] = useState<[number, number]>([1, 10]);
  const [body, setBody] = useState<[number, number]>([1, 10]);
  const [rating, setRating] = useState<[number, number]>([3.0, 5.0]);
  const [drinkingNow, setDrinkingNow] = useState(false);
  const [sort, setSort] = useState('rating-desc');
  const [page, setPage] = useState(0);
  const pageSize = 24;

  const fetchWines = useCallback(async () => {
    setLoading(true);
    try {
      const [sortBy, sortDir] = sort.split('-') as [string, 'asc' | 'desc'];
      const result = await getWines({
        search: search || undefined,
        color: colors.length ? colors : undefined,
        country: countries.length ? countries : undefined,
        region: regions.length ? regions : undefined,
        grape: grapes.length ? grapes[0] : undefined,
        minSweetness: sweetness[0] > 1 ? sweetness[0] : undefined,
        maxSweetness: sweetness[1] < 10 ? sweetness[1] : undefined,
        minAcidity: acidity[0] > 1 ? acidity[0] : undefined,
        maxAcidity: acidity[1] < 10 ? acidity[1] : undefined,
        minTannins: tannins[0] > 1 ? tannins[0] : undefined,
        maxTannins: tannins[1] < 10 ? tannins[1] : undefined,
        minBody: body[0] > 1 ? body[0] : undefined,
        maxBody: body[1] < 10 ? body[1] : undefined,
        minRating: rating[0] > 3.0 ? rating[0] : undefined,
        maxRating: rating[1] < 5.0 ? rating[1] : undefined,
        drinkingNow,
        sortBy,
        sortDir,
        limit: pageSize,
        offset: page * pageSize,
      });
      setWines(result.wines);
      setCount(result.count);
    } finally {
      setLoading(false);
    }
  }, [search, colors, countries, regions, grapes, sweetness, acidity, tannins, body, rating, drinkingNow, sort, page]);

  useEffect(() => { fetchWines(); }, [fetchWines]);

  function toggleArr<T>(arr: T[], setArr: (v: T[]) => void, val: T) {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
    setPage(0);
  }

  function clearAll() {
    setSearch(''); setColors([]); setCountries([]); setRegions([]);
    setGrapes([]); setSweetness([1, 10]); setAcidity([1, 10]);
    setTannins([1, 10]); setBody([1, 10]);
    setRating([3.0, 5.0]); setDrinkingNow(false); setPage(0);
  }

  const hasFilters = search || colors.length || countries.length || regions.length ||
    grapes.length || drinkingNow ||
    sweetness[0] > 1 || sweetness[1] < 10 || acidity[0] > 1 || acidity[1] < 10 ||
    tannins[0] > 1 || tannins[1] < 10 || body[0] > 1 || body[1] < 10 ||
    rating[0] > 3.0 || rating[1] < 5.0;

  const sidebar = (
    <div className="space-y-0">
      <FilterSection title="Wine Type">
        <div className="flex flex-wrap gap-2">
          {(filterOptions.colors.length ? filterOptions.colors : ['red', 'white', 'rose', 'sparkling', 'dessert', 'fortified']).map((c) => (
            <button
              key={c}
              onClick={() => { toggleArr(colors, setColors, c); }}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-all duration-200',
                colors.includes(c)
                  ? 'border-gold text-gold bg-gold/10'
                  : 'border-border text-text-secondary hover:border-text-muted'
              )}
            >
              {WINE_COLOR_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Country" defaultOpen={false}>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {filterOptions.countries.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={countries.includes(c)}
                onChange={() => { toggleArr(countries, setCountries, c); }}
                className="accent-gold"
              />
              <span className="text-xs text-text-secondary group-hover:text-text transition-colors">{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Region" defaultOpen={false}>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {filterOptions.regions.slice(0, 20).map((r) => (
            <label key={r} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={regions.includes(r)}
                onChange={() => { toggleArr(regions, setRegions, r); }}
                className="accent-gold"
              />
              <span className="text-xs text-text-secondary group-hover:text-text transition-colors">{r}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Grape Variety" defaultOpen={false}>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {filterOptions.grapes.slice(0, 30).map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={grapes.includes(g)}
                onChange={() => { toggleArr(grapes, setGrapes, g); }}
                className="accent-gold"
              />
              <span className="text-xs text-text-secondary group-hover:text-text transition-colors">{g}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Flavor Profile" defaultOpen={false}>
        <div className="space-y-4">
          <RangeSlider label="Sweetness" min={1} max={10} value={sweetness} onChange={(v) => { setSweetness(v); setPage(0); }} />
          <RangeSlider label="Acidity" min={1} max={10} value={acidity} onChange={(v) => { setAcidity(v); setPage(0); }} />
          <RangeSlider label="Tannins" min={1} max={10} value={tannins} onChange={(v) => { setTannins(v); setPage(0); }} />
          <RangeSlider label="Body" min={1} max={10} value={body} onChange={(v) => { setBody(v); setPage(0); }} />
        </div>
      </FilterSection>

      <FilterSection title="Rating" defaultOpen={false}>
        <RangeSlider label="Rating" min={3.0} max={5.0} step={0.1} value={rating} onChange={(v) => { setRating(v); setPage(0); }} />
      </FilterSection>

      <div className="py-4">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={drinkingNow}
            onChange={(e) => { setDrinkingNow(e.target.checked); setPage(0); }}
            className="accent-gold"
          />
          <span className="text-xs text-text-secondary group-hover:text-text transition-colors">
            Ready to Drink Now
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-2 pb-3 border-b border-border">
            <span className="text-xs uppercase tracking-[0.2em] text-text-secondary">Filters</span>
            {hasFilters && (
              <button onClick={clearAll} className="text-xs text-gold hover:text-gold-light transition-colors">
                Clear All
              </button>
            )}
          </div>
          {filterError && (
            <p className="text-xs text-text-secondary mb-3 py-2 px-3 rounded border border-border bg-surface">
              Filters unavailable — connection issue.
            </p>
          )}
          {sidebar}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search wines, producers, regions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                <X size={12} />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(0); }}
            className="bg-surface border border-border rounded px-3 py-2.5 text-sm text-text focus:outline-none focus:border-gold transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-border rounded text-sm text-text-secondary hover:border-gold hover:text-text transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
          </button>
        </div>

        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-text-secondary">
            {loading ? 'Loading...' : `${count} wines`}
          </p>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-gold hover:text-gold-light transition-colors lg:hidden">
              Clear All
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-lg shimmer" />
            ))}
          </div>
        ) : wines.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-text-secondary mb-2">No wines match your filters.</p>
            <button onClick={clearAll} className="text-sm text-gold hover:text-gold-light transition-colors">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {wines.map((wine, i) => (
              <WineCard key={wine.id} wine={wine} index={i} />
            ))}
          </div>
        )}

        {count > pageSize && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-border text-sm text-text-secondary hover:border-gold hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
            >
              Previous
            </button>
            <span className="text-xs text-text-secondary">
              Page {page + 1} of {Math.ceil(count / pageSize)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= count}
              className="px-4 py-2 border border-border text-sm text-text-secondary hover:border-gold hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-surface border-r border-border z-50 overflow-y-auto lg:hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-text">Filters</span>
                  <button onClick={() => setSidebarOpen(false)} className="text-text-muted hover:text-text">
                    <X size={18} />
                  </button>
                </div>
                {sidebar}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
