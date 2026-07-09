import type { Metadata } from 'next';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import BrowseClient from '@/components/browse/browse-client';
import { getWinesV2 } from '@/lib/wines-v2';

export const metadata: Metadata = {
  title: 'Browse Collection | GetAlc',
  description: 'Tasting notes, flavor profiles, food pairings and regional insights for the world’s finest wines.',
};

export const revalidate = 3600;

export default async function BrowsePage() {
  const { wines } = await getWinesV2({ sortBy: 'price', sortDir: 'desc', limit: 200 });

  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2">The Alcohol Encyclopedia</p>
            <h1
              className="text-4xl md:text-5xl font-bold text-text"
              style={{ fontFamily: 'var(--font-playfair-display)' }}
            >
              Browse Collection
            </h1>
          </div>
          <BrowseClient wines={wines} />
        </div>
      </main>
      <Footer />
    </>
  );
}
