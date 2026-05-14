import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, MapPin, ArrowLeft, ShoppingCart, Thermometer, GlassWater } from 'lucide-react';
import Link from 'next/link';
import { getBeerBySlug } from '@/lib/supabase';
import { BeerFlavorBars } from '@/components/products/flavor-bars';
import FoodPairings from '@/components/products/food-pairings';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import { formatRating, formatReviewCount } from '@/lib/utils';

const BEER_IMAGE = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const beer = await getBeerBySlug(slug);
  if (!beer) return { title: 'Beer Not Found' };
  return {
    title: `${beer.name} | ${beer.brewery}`,
    description: beer.description || `Discover ${beer.name} by ${beer.brewery}. ${beer.style} with ${beer.abv}% ABV.`,
    openGraph: {
      title: beer.name,
      description: beer.description,
      images: [BEER_IMAGE],
    },
  };
}

export default async function BeerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const beer = await getBeerBySlug(slug);
  if (!beer) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: beer.name,
    description: beer.description,
    image: BEER_IMAGE,
    brand: { '@type': 'Brand', name: beer.brewery },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: beer.rating,
      reviewCount: beer.review_count,
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
            href="/beers"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-muted hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft size={12} /> Craft Beer Collection
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-surface">
                <Image
                  src={BEER_IMAGE}
                  alt={beer.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.4) 0%, transparent 50%)' }} />
                {beer.style && (
                  <span className="absolute top-4 left-4 text-xs px-3 py-1.5 rounded border border-amber-700/40 bg-amber-950/30 text-amber-200 font-medium tracking-wide">
                    {beer.style}
                  </span>
                )}
              </div>

              {beer.aroma_profile?.length > 0 && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Aroma Profile</h3>
                  <div className="flex flex-wrap gap-2">
                    {beer.aroma_profile.map((a) => (
                      <span key={a} className="text-sm px-3 py-1 rounded-full border border-gold/30 text-gold-light bg-gold/5">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {beer.suggested_glassware && (
                  <div className="p-4 rounded-lg border border-border bg-surface">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 mb-1">
                      <GlassWater size={10} /> Glassware
                    </span>
                    <span className="text-sm text-text-secondary">{beer.suggested_glassware}</span>
                  </div>
                )}
                {beer.serving_temp_f && (
                  <div className="p-4 rounded-lg border border-border bg-surface">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 mb-1">
                      <Thermometer size={10} /> Serve At
                    </span>
                    <span className="text-sm text-text-secondary">{beer.serving_temp_f}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">{beer.brewery}</p>
                <h1
                  className="text-3xl md:text-4xl font-bold text-text mb-3 leading-tight"
                  style={{ fontFamily: 'var(--font-playfair-display)' }}
                >
                  {beer.name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < Math.round(beer.rating) ? 'text-gold fill-gold' : 'text-text-muted'}
                      />
                    ))}
                    <span className="text-sm font-semibold text-text ml-1">{formatRating(beer.rating)}</span>
                    <span className="text-xs text-text-secondary">({formatReviewCount(beer.review_count)} ratings)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                  {beer.region && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gold" />
                      {beer.region}
                    </span>
                  )}
                  {beer.country && <span className="text-text-muted">·</span>}
                  {beer.country && <span>{beer.country}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border bg-surface text-center">
                  <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">ABV</span>
                  <span className="text-xl font-bold text-text" style={{ fontFamily: 'var(--font-playfair-display)' }}>
                    {beer.abv > 0 ? `${beer.abv.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface text-center">
                  <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">IBU</span>
                  <span className="text-xl font-bold text-text" style={{ fontFamily: 'var(--font-playfair-display)' }}>
                    {beer.ibu > 0 ? beer.ibu : '—'}
                  </span>
                </div>
                {beer.calories > 0 && (
                  <div className="p-3 rounded-lg border border-border bg-surface text-center">
                    <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">Cal/12oz</span>
                    <span className="text-xl font-bold text-text" style={{ fontFamily: 'var(--font-playfair-display)' }}>
                      {beer.calories}
                    </span>
                  </div>
                )}
                {beer.sub_style && (
                  <div className="p-3 rounded-lg border border-border bg-surface text-center">
                    <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">Sub-style</span>
                    <span className="text-xs font-semibold text-text">{beer.sub_style}</span>
                  </div>
                )}
              </div>

              {beer.description && (
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">About This Beer</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{beer.description}</p>
                </div>
              )}

              {beer.tasting_notes && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Tasting Notes</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{beer.tasting_notes}</p>
                </div>
              )}

              <div className="p-5 rounded-lg border border-border bg-surface">
                <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-4">Flavor Profile</h3>
                <BeerFlavorBars
                  bitterness={beer.bitterness}
                  sweetness={beer.sweetness}
                  body={beer.body}
                  carbonation={beer.carbonation}
                  aroma={beer.aroma}
                  finish={beer.finish}
                />
              </div>

              {(beer.food_pairings?.length > 0) && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <FoodPairings pairings={beer.food_pairings} />
                </div>
              )}

              {beer.features && (
                <div className="p-4 rounded-lg border border-border bg-surface">
                  <span className="text-xs uppercase tracking-[0.15em] text-text-secondary block mb-2">Features</span>
                  <span className="text-sm text-text-secondary">{beer.features}</span>
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
