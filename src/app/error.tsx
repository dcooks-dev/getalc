'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-px bg-gold mx-auto mb-8" />
          <p className="text-xs uppercase tracking-[0.4em] text-gold mb-4">Error</p>
          <h1
            className="text-5xl md:text-6xl font-bold text-text mb-4"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Something Went Wrong
          </h1>
          <p className="text-text-secondary mb-10 max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred. Please try again or return to the homepage.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={reset}
              className="px-8 py-3 text-sm font-medium tracking-wider uppercase transition-all duration-300 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #9B2D3A, #7E2430)',
                color: '#FFFFFF',
                borderRadius: '2px',
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-8 py-3 text-sm font-medium tracking-wider uppercase border border-border text-text-secondary hover:text-text hover:border-gold transition-all duration-300"
              style={{ borderRadius: '2px' }}
            >
              Back to Home
            </Link>
          </div>
          <div className="w-16 h-px bg-gold mx-auto mt-10" />
        </div>
      </main>
      <Footer />
    </>
  );
}
