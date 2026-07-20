'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/wines', label: 'Wines' },
  { href: '/beers', label: 'Beers' },
  { href: '/spirits', label: 'Spirits' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'border-b border-border'
            : 'border-b border-transparent'
        )}
        style={{
          backgroundColor: scrolled ? 'rgba(251,249,245,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link
              href="/"
              className="flex items-center gap-2 group"
              aria-label="GetAlc Home"
            >
              <span
                className="text-2xl font-bold tracking-tight text-text group-hover:text-gold transition-colors duration-300"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Get<span className="text-gold">Alc</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm tracking-wider uppercase transition-colors duration-300 relative group',
                    pathname.startsWith(link.href)
                      ? 'text-gold'
                      : 'text-text-secondary hover:text-text'
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      'absolute -bottom-1 left-0 h-px bg-gold transition-all duration-300',
                      pathname.startsWith(link.href)
                        ? 'w-full'
                        : 'w-0 group-hover:w-full'
                    )}
                  />
                </Link>
              ))}
            </nav>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-text-secondary hover:text-text transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-0 right-0 z-40 border-b border-border"
            style={{ backgroundColor: 'rgba(251,249,245,0.98)', backdropFilter: 'blur(12px)' }}
          >
            <nav className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'text-lg tracking-wider uppercase transition-colors duration-300',
                    pathname.startsWith(link.href)
                      ? 'text-gold'
                      : 'text-text-secondary hover:text-text'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
