'use client';

import type { Wine } from '@/types';
import { WineCard } from '@/components/products/product-card';

interface BrowseClientProps {
  wines: Wine[];
}

export default function BrowseClient({ wines }: BrowseClientProps) {
  return (
    <div id="categories">
      <div className="flex items-center gap-2 mb-6">
        <span className="px-5 py-2 text-xs font-medium uppercase tracking-[0.15em] rounded bg-gold text-background">
          Wines
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-black/20">{wines.length}</span>
        </span>
        <span className="px-5 py-2 text-xs font-medium uppercase tracking-[0.15em] rounded border border-border text-text-muted">
          Beers &middot; Soon
        </span>
        <span className="px-5 py-2 text-xs font-medium uppercase tracking-[0.15em] rounded border border-border text-text-muted">
          Spirits &middot; Soon
        </span>
      </div>

      {wines.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wines.map((wine, i) => (
            <WineCard key={wine.slug} wine={wine} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
