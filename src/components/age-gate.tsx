'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgeGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  function handleConfirm() {
    setVisible(false);
  }

  function handleDeny() {
    window.location.href = 'https://www.responsibility.org/';
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="age-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(12px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-full max-w-md mx-4 text-center"
          >
            <div className="mb-8">
              <div className="w-16 h-px bg-gold mx-auto mb-6" />
              <h1
                className="text-4xl md:text-5xl font-bold mb-3 text-text"
                style={{ fontFamily: 'var(--font-playfair-display)' }}
              >
                GetAlc
              </h1>
              <p className="text-text-secondary text-sm tracking-[0.25em] uppercase">
                Premium Spirits Discovery
              </p>
              <div className="w-16 h-px bg-gold mx-auto mt-6" />
            </div>

            <div className="mb-10">
              <h2
                className="text-2xl font-semibold text-text mb-3"
                style={{ fontFamily: 'var(--font-playfair-display)' }}
              >
                Welcome
              </h2>
              <p className="text-text-secondary leading-relaxed">
                This website contains content related to alcoholic beverages. Please confirm you are of legal drinking age in your country.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleConfirm}
                className="px-8 py-3 text-sm font-medium tracking-wider uppercase transition-all duration-300 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #D4A853, #B8892E)',
                  color: '#0A0A0A',
                  borderRadius: '2px',
                }}
              >
                I Am of Legal Age
              </button>
              <button
                onClick={handleDeny}
                className="px-8 py-3 text-sm font-medium tracking-wider uppercase border border-border text-text-secondary hover:text-text transition-all duration-300 cursor-pointer"
                style={{ borderRadius: '2px', background: 'transparent' }}
              >
                I Am Not
              </button>
            </div>

            <p className="mt-8 text-text-muted text-xs">
              By entering, you agree to our Terms of Service. Drink responsibly.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
