import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, MapPin, Grape, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { getWineBySlug } from '@/lib/supabase';
import { WineFlavorBars } from '@/components/products/flavor-bars';
import DrinkingWindow from '@/components/products/drinking-window';
import FoodPairings from '@/components/products/food-pairings';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import { WINE_COLOR_LABELS, WINE_COLOR_CLASSES, formatRating, formatReviewCount, cn } from '@/lib/utils';

const WINE_IMAGE = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const wine = await getWineBySlug(slug);
  if (!wine) return { title: 'Wine Not Found' };
  return {
    title: `${wine.display_name} | ${wine.producer}`,
    description: wine.description || `Discover ${wine.display_name} from ${wine.producer}. ${wine.color} wine from ${wine.region}.`,
    openGraph: {
      title: wine.display_name,
      description: wine.description,
      images: [WINE_IMAGE],
    },
  };
}

export default async function WineDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wine = await getWineBySlug(slug);
  if (!wine) notFound();

  const currentYear = new Date().getFullYear();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: wine.display_name,
    description: wine.description,
    image: WINE_IMAGE,
    brand: { '@type': 'Brand', name: wine.producer },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: wine.rating,
      reviewCount: wine.review_count,
      bestRating: 5,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href="/wines"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-muted hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft size={12} /> Wine Collection
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-surface">
                <Image
                  src={WINE_IMAGE}
                  alt={wine.display_name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.4) 0%, transparent 50%)' }} />
                <span
                  className={cn(
                    'absolute top-4 left-4 text-xs px-3 py-1.5 rounded border font-medium tracking-wide',
                    WINE_COLOR_CLASSES[wine.color] ?? WINE_COLOR_CLASSES.red
                  )}
                >
                  {WINE_COLOR_LABELS[wine.color] ?? wine.color}
                </span>
              </div>

            </div>

            <div className="space-y-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">{wine.producer}</p>
                <h1
                  className="text-3xl md:text-4xl font-bold text-text mb-3 leading-tight"
                  style={{ fontFamily: 'var(--font-playfair-display)' }}
                >
                  {wine.display_name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < Math.round(wine.rating) ? 'text-gold fill-gold' : 'text-text-muted'}
                      />
                    ))}
                    <span className="text-sm font-semibold text-text ml-1">{formatRating(wine.rating)}</span>
                    <span className="text-xs text-text-secondary">({formatReviewCount(wine.review_count)} ratings)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                  {wine.region && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gold" />
                      {wine.region}
                    </span>
                  )}
                  {wine.country && <span className="text-text-muted">·</span>}
                  {wine.country && <span>{wine.country}</span>}
                  {wine.vintage && <span className="text-text-secondary">· {wine.vintage}</span>}
                  {wine.alcohol_pct > 0 && <span className="text-text-secondary">· {wine.alcohol_pct.toFixed(1)}% ABV</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-surface text-center">
                  <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">ABV</span>
                  <span className="text-xl font-bold text-text" style={{ fontFamily: 'var(--font-playfair-display)' }}>
                    {wine.alcohol_pct > 0 ? `${wine.alcohol_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface text-center">
                  <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">Vintage</span>
                  <span className="text-xl font-bold text-text" style={{ fontFamily: 'var(--font-playfair-display)' }}>
                    {wine.vintage || '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface text-center">
                  <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">Sub-type</span>
                  <span className="text-sm font-semibold text-text capitalize">
                    {wine.sub_type || '—'}
                  </span>
                </div>
              </div>

              {wine.grapes?.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2 mb-3">
                    <Grape size={12} /> Grape Varieties
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {wine.grapes.map((g) => (
                      <span key={g} className="text-sm px-3 py-1.5 rounded-full border border-border text-text-secondary hover:border-gold hover:text-text transition-colors">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {wine.description && (
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">About This Wine</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{wine.description}</p>
                </div>
              )}

              {wine.tasting_notes && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Tasting Notes</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{wine.tasting_notes}</p>
                </div>
              )}

              <div className="p-5 rounded-lg border border-border bg-surface">
                <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-4">Flavor Profile</h3>
                <WineFlavorBars
                  sweetness={wine.sweetness}
                  acidity={wine.acidity}
                  tannins={wine.tannins}
                  alcohol={wine.alcohol_intensity}
                  body={wine.body}
                  finish={wine.finish}
                />
              </div>

              {wine.drinking_window_start && wine.drinking_window_end && wine.vintage && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <DrinkingWindow
                    vintage={wine.vintage}
                    start={wine.drinking_window_start}
                    end={wine.drinking_window_end}
                  />
                </div>
              )}

              {wine.food_pairings?.length > 0 && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <FoodPairings pairings={wine.food_pairings} />
                </div>
              )}

              {wine.region_insights && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3 flex items-center gap-2">
                    <MapPin size={12} /> Region Insights
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{wine.region_insights}</p>
                </div>
              )}

              {wine.description_long && (
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Extended Notes</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{wine.description_long}</p>
                </div>
              )}

              {wine.aroma_profile?.length > 0 && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Aroma Profile</h3>
                  <div className="flex flex-wrap gap-2">
                    {wine.aroma_profile.map((a) => (
                      <span key={a} className="text-sm px-3 py-1 rounded-full border border-gold/30 text-gold-light bg-gold/5">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled
                className="w-full flex items-center justify-center gap-3 py-4 text-sm font-medium tracking-wider uppercase opacity-40 cursor-not-allowed border border-gold/30 text-gold rounded"
                title="Purchase functionality coming soon"
              >
                <ShoppingCart size={16} />
                Buy Now — Coming Soon
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
