'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #0A0A0A 0%, #0D0B08 60%, #0A0A0A 100%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(212,168,83,0.06) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-64"
          style={{ background: 'linear-gradient(to top, #0A0A0A, transparent)' }}
        />
      </div>

      <div className="absolute top-0 left-0 right-0 grid grid-cols-3 h-full opacity-[0.03] pointer-events-none select-none">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border-r border-white/50 h-full" />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.4em] text-gold mb-4">
            The Alcohol Encyclopedia
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold leading-none mb-6 text-text"
          style={{ fontFamily: 'var(--font-playfair-display)' }}
        >
          Discover
          <br />
          <span className="gold-gradient">Extraordinary Drinks</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Tasting notes, flavor profiles, drinking windows and regional insights for the world&rsquo;s finest wines — beers and spirits coming soon.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/browse"
            className="px-8 py-4 text-sm font-medium tracking-wider uppercase transition-all duration-300 hover:shadow-gold"
            style={{
              background: 'linear-gradient(135deg, #D4A853, #B8892E)',
              color: '#0A0A0A',
              borderRadius: '2px',
            }}
          >
            Explore Collection →
          </Link>
          <Link
            href="/browse#categories"
            className="px-8 py-4 text-sm font-medium tracking-wider uppercase border border-border text-text-secondary hover:text-text hover:border-gold transition-all duration-300"
            style={{ borderRadius: '2px' }}
          >
            Browse by Category →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-20 flex items-center justify-center gap-12 text-center"
        >
          {[
            { value: '50+', label: 'Premium Wines' },
            { value: '6', label: 'Countries' },
            { value: 'Soon', label: 'Beers & Spirits' },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                className="text-3xl font-bold text-gold mb-1"
                style={{ fontFamily: 'var(--font-playfair-display)' }}
              >
                {stat.value}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

    </section>
  );
}
