import type { Metadata } from 'next';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import BeerBrowseClient from '@/components/browse/beer-browse-client';
import { getBeerFilterOptions } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Craft Beer Collection',
  description:
    'Discover exceptional craft beers from celebrated breweries around the world. Filter by style, brewery, ABV, IBU and more.',
};

export const revalidate = 3600;

export default async function BeersPage() {
  const filterOptions = await getBeerFilterOptions().catch(() => ({
    styles: [], breweries: [], countries: [],
  }));

  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2">Collection</p>
            <h1
              className="text-4xl md:text-5xl font-bold text-text"
              style={{ fontFamily: 'var(--font-playfair-display)' }}
            >
              Craft Beer
            </h1>
          </div>
          <BeerBrowseClient filterOptions={filterOptions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
