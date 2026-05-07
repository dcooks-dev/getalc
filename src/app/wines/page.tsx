import type { Metadata } from 'next';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import WineBrowseClient from '@/components/browse/wine-browse-client';
import { getWineFilterOptions } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Wine Collection',
  description:
    'Browse our curated collection of premium wines from around the world. Filter by color, region, grape variety, flavor profile and more.',
};

export const revalidate = 3600;

export default async function WinesPage() {
  const filterOptions = await getWineFilterOptions().catch(() => ({
    colors: [], countries: [], regions: [], grapes: [],
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
              Wine
            </h1>
          </div>
          <WineBrowseClient filterOptions={filterOptions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
