import Link from 'next/link';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-px bg-gold mx-auto mb-8" />
          <p className="text-xs uppercase tracking-[0.4em] text-gold mb-4">404</p>
          <h1
            className="text-5xl md:text-6xl font-bold text-text mb-4"
            style={{ fontFamily: 'var(--font-playfair-display)' }}
          >
            Page Not Found
          </h1>
          <p className="text-text-secondary mb-10 max-w-sm mx-auto leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="px-8 py-3 text-sm font-medium tracking-wider uppercase transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #D4A853, #B8892E)',
                color: '#0A0A0A',
                borderRadius: '2px',
              }}
            >
              Back to Home
            </Link>
            <Link
              href="/wines"
              className="px-8 py-3 text-sm font-medium tracking-wider uppercase border border-border text-text-secondary hover:text-text hover:border-gold transition-all duration-300"
              style={{ borderRadius: '2px' }}
            >
              Browse Wines
            </Link>
          </div>
          <div className="w-16 h-px bg-gold mx-auto mt-10" />
        </div>
      </main>
      <Footer />
    </>
  );
}
