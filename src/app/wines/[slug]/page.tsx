import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPin, Grape, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { getWineByIdV2 } from '@/lib/wines-v2';
import { WineFlavorBars } from '@/components/products/flavor-bars';
import DrinkingWindow from '@/components/products/drinking-window';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import { WINE_COLOR_LABELS, WINE_COLOR_CLASSES, WINE_IMAGE_MAP, formatPrice, cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const wine = await getWineByIdV2(slug);
  if (!wine) return { title: 'Wine Not Found' };
  const image = wine.image_url || WINE_IMAGE_MAP[wine.color] || WINE_IMAGE_MAP.red;
  return {
    title: `${wine.display_name} | ${wine.producer}`,
    description: wine.description || `Discover ${wine.display_name} from ${wine.producer}. ${wine.color} wine from ${wine.region}.`,
    openGraph: {
      title: wine.display_name,
      description: wine.description,
      images: [image],
    },
  };
}

export default async function WineDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wine = await getWineByIdV2(slug);
  if (!wine) notFound();

  const wineImage = wine.image_url || WINE_IMAGE_MAP[wine.color] || WINE_IMAGE_MAP.red;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: wine.display_name,
    description: wine.description,
    image: wineImage,
    brand: { '@type': 'Brand', name: wine.producer },
    ...(wine.price != null && wine.price > 0
      ? { offers: { '@type': 'Offer', price: wine.price, priceCurrency: wine.original_currency || 'USD', availability: 'https://schema.org/InStock' } }
      : {}),
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
              {/* TODO: run background removal via remove.bg API once all Datafeedr images are loaded into DB — estimated cost ~$0.02 per image (one-time batch) */}
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-[#F4EEE6]">
                <Image
                  src={wineImage}
                  alt={wine.display_name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
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
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  {wine.display_name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                  {wine.region && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gold" />
                      {wine.region}
                    </span>
                  )}
                  {wine.country && <span className="text-text-muted">·</span>}
                  {wine.country && <span>{wine.country}</span>}
                  {wine.vintage > 0 && <span className="text-text-secondary">· {wine.vintage}</span>}
                  {wine.alcohol_pct > 0 && <span className="text-text-secondary">· {wine.alcohol_pct.toFixed(1)}% ABV</span>}
                  {wine.residual_sugar && <span className="text-text-secondary capitalize">· {wine.residual_sugar}</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-surface text-center">
                  <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">ABV</span>
                  <span className="text-xl font-bold text-text" style={{ fontFamily: 'var(--font-inter)' }}>
                    {wine.alcohol_pct > 0 ? `${wine.alcohol_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface text-center">
                  <span className="text-xs uppercase tracking-wide text-text-secondary block mb-1">Vintage</span>
                  <span className="text-xl font-bold text-text" style={{ fontFamily: 'var(--font-inter)' }}>
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

              {wine.drinking_window_start > 0 && wine.drinking_window_end > 0 && wine.vintage > 0 && (
                <div className="p-5 rounded-lg border border-border bg-surface space-y-4">
                  <DrinkingWindow
                    vintage={wine.vintage}
                    start={wine.drinking_window_start}
                    end={wine.drinking_window_end}
                  />
                  {wine.drinking_statement && (
                    <p className="text-sm text-text-secondary leading-relaxed">{wine.drinking_statement}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {wine.drinking_young && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gold mb-1">Drink Young</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{wine.drinking_young}</p>
                      </div>
                    )}
                    {wine.drinking_ripe && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gold mb-1">At Peak Maturity</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{wine.drinking_ripe}</p>
                      </div>
                    )}
                  </div>
                  {wine.drinking_storage && (
                    <p className="text-xs text-text-muted">Storage — {wine.drinking_storage}</p>
                  )}
                </div>
              )}

              {wine.pairing_text && (
                <div className="p-5 rounded-lg border border-border bg-surface">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-3">Food Pairing</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{wine.pairing_text}</p>
                </div>
              )}

              {(wine.region_insights || wine.region_climate || wine.region_styles || wine.region_key_grapes) && (
                <div className="p-5 rounded-lg border border-border bg-surface space-y-4">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2">
                    <MapPin size={12} /> Region Insights{wine.region ? ` — ${wine.region}` : ''}
                  </h3>
                  {wine.region_insights && (
                    <p className="text-sm text-text-secondary leading-relaxed">{wine.region_insights}</p>
                  )}
                  {wine.region_climate && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gold mb-1">Climate &amp; Terroir</p>
                      <p className="text-sm text-text-secondary leading-relaxed">{wine.region_climate}</p>
                    </div>
                  )}
                  {wine.region_styles && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gold mb-2">Signature Styles</p>
                      <div className="flex flex-wrap gap-2">
                        {wine.region_styles.split(';').map((s) => s.trim()).filter(Boolean).map((s) => (
                          <span key={s} className="text-xs px-3 py-1 rounded-full border border-border text-text-secondary">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {wine.region_key_grapes && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gold mb-2">Key Grapes of the Region</p>
                      <div className="flex flex-wrap gap-2">
                        {wine.region_key_grapes.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                          <span key={s} className="text-xs px-3 py-1 rounded-full border border-border text-text-secondary">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(wine.description_long || wine.tasting_notes_long || wine.pairing_long) && (
                <details className="group">
                  <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-text-secondary hover:text-gold transition-colors list-none flex items-center gap-2">
                    Extended Notes
                    <span className="text-text-muted group-open:rotate-90 transition-transform">›</span>
                  </summary>
                  <div className="pt-4 space-y-4">
                    {wine.description_long && (
                      <p className="text-sm text-text-secondary leading-relaxed">{wine.description_long}</p>
                    )}
                    {wine.tasting_notes_long && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gold mb-1">Detailed Tasting Notes</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{wine.tasting_notes_long}</p>
                      </div>
                    )}
                    {wine.pairing_long && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gold mb-1">More on Pairing</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{wine.pairing_long}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="space-y-3">
                {wine.price != null && wine.price > 0 && (
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-2xl font-bold text-gold"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      {formatPrice(wine.price)}
                    </span>
                    {wine.merchant_name && (
                      <span className="text-xs text-text-muted">via {wine.merchant_name}</span>
                    )}
                  </div>
                )}
                {wine.product_url ? (
                  <a
                    href={wine.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 text-sm font-medium tracking-wider uppercase border border-gold/50 text-gold rounded hover:bg-gold/10 transition-colors duration-200"
                  >
                    <ShoppingCart size={16} />
                    Buy Now →
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-3 py-4 text-sm font-medium tracking-wider uppercase opacity-40 cursor-not-allowed border border-gold/30 text-gold rounded"
                    title="Purchase functionality coming soon"
                  >
                    <ShoppingCart size={16} />
                    Buy Now — Coming Soon
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
