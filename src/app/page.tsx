import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Wine, Beer } from 'lucide-react';
import { getFeaturedWines, getFeaturedBeers } from '@/lib/supabase';
import { WineCard, BeerCard } from '@/components/products/product-card';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import AgeGate from '@/components/age-gate';
import HeroSection from '@/components/home/hero-section';

export const metadata: Metadata = {
  title: 'GetAlc — Discover Premium Wines & Craft Beers',
  description:
    'Explore an editorial collection of premium wines and craft beers. Deep tasting notes, flavor profiles, food pairings and more — all in one place.',
};

export const revalidate = 3600;

export default async function HomePage() {
  const [featuredWines, featuredBeers] = await Promise.all([
    getFeaturedWines(8).catch(() => []),
    getFeaturedBeers(8).catch(() => []),
  ]);

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
                  style={{ fontFamily: 'var(--font-playfair-display)' }}
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
                <WineCard key={wine.id} wine={wine} index={i} />
              ))}
            </div>
          </section>
        )}

        <section className="border-y border-border py-20" style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #111111 100%)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="w-12 h-px bg-gold mx-auto mb-8" />
            <blockquote
              className="text-2xl md:text-3xl font-light text-text leading-relaxed mb-6"
              style={{ fontFamily: 'var(--font-playfair-display)' }}
            >
              &ldquo;Wine is the most civilized thing in the world.&rdquo;
            </blockquote>
            <cite className="text-xs uppercase tracking-[0.2em] text-gold">Ernest Hemingway</cite>
            <div className="w-12 h-px bg-gold mx-auto mt-8" />
          </div>
        </section>

        {featuredBeers.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2 flex items-center gap-2">
                  <Beer size={12} /> Featured
                </p>
                <h2
                  className="text-3xl md:text-4xl font-bold text-text"
                  style={{ fontFamily: 'var(--font-playfair-display)' }}
                >
                  Craft Beers
                </h2>
              </div>
              <Link
                href="/beers"
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors group"
              >
                View All
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredBeers.map((beer, i) => (
                <BeerCard key={beer.id} beer={beer} index={i} />
              ))}
            </div>
          </section>
        )}

        {featuredWines.length === 0 && featuredBeers.length === 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
            <h2
              className="text-3xl font-bold text-text mb-4"
              style={{ fontFamily: 'var(--font-playfair-display)' }}
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
