import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Wine } from 'lucide-react';
import { getFeaturedWinesV2 } from '@/lib/wines-v2';
import { WineCard } from '@/components/products/product-card';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import AgeGate from '@/components/age-gate';
import HeroSection from '@/components/home/hero-section';

export const metadata: Metadata = {
  title: 'GetAlc — Discover Premium Wines',
  description:
    'Explore an editorial collection of premium wines. Deep tasting notes, flavor profiles, food pairings, drinking windows and regional insights — all in one place.',
};

export const revalidate = 3600;

export default async function HomePage() {
  const featuredWines = await getFeaturedWinesV2(8).catch(() => []);

  return (
    <>
      <AgeGate />
      <Navbar />
      <main>
        <HeroSection />

        {featuredWines.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2 flex items-center gap-2">
                  <Wine size={12} /> Featured
                </p>
                <h2
                  className="text-3xl md:text-4xl font-bold text-text"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Exceptional Wines
                </h2>
              </div>
              <Link
                href="/wines"
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors group"
              >
                View All
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredWines.map((wine, i) => (
                <WineCard key={wine.slug} wine={wine} index={i} />
              ))}
            </div>
          </section>
        )}

        <section className="border-y border-border py-20" style={{ background: 'linear-gradient(135deg, #F6EEE3 0%, #F1E8DA 100%)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="w-12 h-px bg-gold mx-auto mb-8" />
            <blockquote
              className="text-2xl md:text-3xl font-light text-text leading-relaxed mb-6"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              &ldquo;Wine is the most civilized thing in the world.&rdquo;
            </blockquote>
            <cite className="text-xs uppercase tracking-[0.2em] text-gold">Ernest Hemingway</cite>
            <div className="w-12 h-px bg-gold mx-auto mt-8" />
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2">More to Explore</p>
          <h2
            className="text-3xl md:text-4xl font-bold text-text mb-4"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Beers &amp; Spirits — Coming Soon
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            We&rsquo;re extending the same verified, editorial approach to craft beers and spirits.
            Our wine collection is live now.
          </p>
        </section>

        {featuredWines.length === 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
            <h2
              className="text-3xl font-bold text-text mb-4"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Collection Coming Soon
            </h2>
            <p className="text-text-secondary">The database is being populated. Check back shortly.</p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
