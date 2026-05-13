import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <h3
              className="text-xl font-bold mb-3 text-text"
              style={{ fontFamily: 'var(--font-playfair-display)' }}
            >
              Get<span className="text-gold">Alc</span>
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              An editorial guide to the world&apos;s finest wines and craft beers. Curated with passion, explored with purpose.
            </p>
          </div>
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-text-secondary mb-4">Explore</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/wines" className="text-sm text-text-secondary hover:text-gold transition-colors">
                  Wine Collection
                </Link>
              </li>
              <li>
                <Link href="/beers" className="text-sm text-text-secondary hover:text-gold transition-colors">
                  Craft Beers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-text-secondary mb-4">About</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              GetAlc is a demo project showcasing premium alcohol discovery. All data sourced from real producers. Please drink responsibly.
            </p>
          </div>
        </div>

        <div className="border-t border-border-subtle pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            © {new Date().getFullYear()} GetAlc. For adults of legal drinking age only.
          </p>
          <p className="text-xs text-text-secondary">
            Please drink responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
