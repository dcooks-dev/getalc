'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { Wine, Beer } from '@/types';
import {
  cn,
  formatRating,
  formatReviewCount,
  formatPrice,
  WINE_COLOR_LABELS,
  WINE_COLOR_CLASSES,
  WINE_IMAGE_MAP,
  getBeerImage,
} from '@/lib/utils';

interface WineCardProps {
  wine: Wine;
  index?: number;
}

export function WineCard({ wine, index = 0 }: WineCardProps) {
  const imageUrl = wine.image_url || WINE_IMAGE_MAP[wine.color] || WINE_IMAGE_MAP.red;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="h-full"
    >
      <Link href={`/wines/${wine.slug}`} className="flex flex-col h-full group">
        <div className="card-hover rounded-lg overflow-hidden border border-border bg-surface flex flex-col h-full">
          {/* TODO: run background removal via remove.bg API once all Datafeedr images are loaded into DB — estimated cost ~$0.02 per image (one-time batch) */}
          <div className="relative h-[280px] shrink-0 overflow-hidden bg-[#F4EEE6]">
            <Image
              src={imageUrl}
              alt={wine.display_name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(43,32,25,0.05) 0%, transparent 55%)' }} />
            <span
              className={cn(
                'absolute top-3 left-3 text-xs px-2 py-1 rounded border font-medium tracking-wide',
                WINE_COLOR_CLASSES[wine.color] ?? WINE_COLOR_CLASSES.red
              )}
            >
              {WINE_COLOR_LABELS[wine.color] ?? wine.color}
            </span>
            {wine.vintage && (
              <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded border border-border bg-background/60 text-text-secondary">
                {wine.vintage}
              </span>
            )}
          </div>

          <div className="p-4 flex flex-col flex-1 justify-between">
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-1 truncate">
                {wine.producer}
              </p>
              <h3
                className="text-base font-semibold text-text mb-1 line-clamp-2 group-hover:text-gold transition-colors duration-300"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {wine.display_name}
              </h3>
              <p className="text-xs text-text-secondary mb-3 truncate">
                {wine.region}{wine.country ? ` · ${wine.country}` : ''}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                {wine.price != null && wine.price > 0 ? (
                  <span className="text-sm font-semibold text-gold">{formatPrice(wine.price)}</span>
                ) : <span />}
                {wine.alcohol_pct > 0 && (
                  <span className="text-xs text-text-secondary">{wine.alcohol_pct.toFixed(1)}% ABV</span>
                )}
              </div>

              {wine.grapes?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {wine.grapes.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

interface BeerCardProps {
  beer: Beer;
  index?: number;
}

export function BeerCard({ beer, index = 0 }: BeerCardProps) {
  const imageUrl = beer.image_url || getBeerImage(beer.style);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="h-full"
    >
      <Link href={`/beers/${beer.slug}`} className="flex flex-col h-full group">
        <div className="card-hover rounded-lg overflow-hidden border border-border bg-surface flex flex-col h-full">
          {/* TODO: run background removal via remove.bg API once all Datafeedr images are loaded into DB — estimated cost ~$0.02 per image (one-time batch) */}
          <div className="relative h-[280px] shrink-0 overflow-hidden bg-[#F4EEE6]">
            <Image
              src={imageUrl}
              alt={beer.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(43,32,25,0.05) 0%, transparent 55%)' }} />
            {beer.style && (
              <span className="absolute top-3 left-3 text-xs px-2 py-1 rounded border border-amber-700/40 bg-amber-950/30 text-amber-200 font-medium tracking-wide">
                {beer.style}
              </span>
            )}
            {beer.abv > 0 && (
              <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded border border-border bg-background/60 text-text-secondary">
                {beer.abv.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="p-4 flex flex-col flex-1 justify-between">
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-1 truncate">
                {beer.brewery}
              </p>
              <h3
                className="text-base font-semibold text-text mb-1 line-clamp-2 group-hover:text-gold transition-colors duration-300"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {beer.name}
              </h3>
              <p className="text-xs text-text-secondary mb-3 truncate">
                {beer.region}{beer.country ? ` · ${beer.country}` : ''}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Star size={12} className="text-gold fill-gold" />
                  <span className="text-sm font-semibold text-text">{formatRating(beer.rating)}</span>
                  <span className="text-xs text-text-secondary">({formatReviewCount(beer.review_count)})</span>
                </div>
                {beer.ibu > 0 && (
                  <span className="text-xs text-text-secondary">{beer.ibu} IBU</span>
                )}
              </div>

              {beer.sub_style && (
                <div>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary">
                    {beer.sub_style}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
