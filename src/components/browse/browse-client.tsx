'use client';

import { useState } from 'react';
import type { Wine, Beer } from '@/types';
import { WineCard } from '@/components/products/product-card';
import { BeerCard } from '@/components/products/product-card';

type Tab = 'all' | 'wines' | 'beers';

interface BrowseClientProps {
  wines: Wine[];
  beers: Beer[];
}

export default function BrowseClient({ wines, beers }: BrowseClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: wines.length + beers.length },
    { id: 'wines', label: 'Wines', count: wines.length },
    { id: 'beers', label: 'Beers', count: beers.length },
  ];

  return (
    <>
      <section id="categories" className="mb-8">
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 text-xs font-medium uppercase tracking-[0.15em] rounded transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gold text-background'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTab === tab.id
                    ? 'bg-black/20 text-background'
                    : 'bg-surface-2 text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {(activeTab === 'all' || activeTab === 'wines') && wines.length > 0 && (
        <div className="mb-12">
          {activeTab === 'all' && (
            <h2
              className="text-xl font-bold text-text mb-6"
              style={{ fontFamily: 'var(--font-playfair-display)' }}
            >
              Wines
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wines.map((wine, i) => (
              <WineCard key={wine.id} wine={wine} index={i} />
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'beers') && beers.length > 0 && (
        <div>
          {activeTab === 'all' && (
            <h2
              className="text-xl font-bold text-text mb-6"
              style={{ fontFamily: 'var(--font-playfair-display)' }}
            >
              Beers
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {beers.map((beer, i) => (
              <BeerCard key={beer.sku} beer={beer} index={i} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
