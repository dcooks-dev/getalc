import Link from 'next/link';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';

export default function ComingSoon({ category }: { category: string }) {
  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="max-w-xl mx-auto px-6 text-center py-32">
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-4">{category}</p>
          <h1
            className="text-4xl md:text-5xl font-bold text-text mb-6"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Coming Soon
          </h1>
          <p className="text-text-secondary leading-relaxed mb-8">
            We&rsquo;re curating a {category.toLowerCase()} collection with the same depth of
            tasting notes, flavor profiles, drinking windows and food pairings as our wines —
            every bottle backed by verified data. Check back soon.
          </p>
          <Link
            href="/wines"
            className="inline-block px-8 py-4 text-sm font-medium tracking-wider uppercase border border-gold/50 text-gold rounded hover:bg-gold/10 transition-colors duration-200"
          >
            Explore Wines →
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
