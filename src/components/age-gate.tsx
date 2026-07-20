'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgeGate() {
  const [visible, setVisible] = useState(false);

  const STORAGE_KEY = 'getalc_age_verified';
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const verifiedAt = parseInt(stored, 10);
      if (Date.now() - verifiedAt < THIRTY_DAYS_MS) return;
    }
    setVisible(true);
  }, []);

  function handleConfirm() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(43,32,25,0.45)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="w-full max-w-md text-center bg-surface border border-border rounded-2xl px-8 py-10 sm:px-10"
            style={{ boxShadow: '0 24px 60px rgba(43,32,25,0.28)' }}
          >
            <div className="mb-7">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-text">
                Get<span className="text-gold">Alc</span>
              </h1>
              <p className="text-text-muted text-xs tracking-[0.25em] uppercase">
                Premium Wine Discovery
              </p>
              <div className="w-12 h-px bg-gold mx-auto mt-6" />
            </div>

            <div className="mb-9">
              <h2 className="text-xl font-semibold text-text mb-3">
                Are you of legal drinking age?
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm">
                This site features content about alcoholic beverages. Please confirm you&rsquo;re of legal drinking age in your country to continue.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleConfirm}
                className="px-8 py-3 text-sm font-medium tracking-wide transition-all duration-300 cursor-pointer hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #9B2D3A, #7E2430)',
                  color: '#FFFFFF',
                  borderRadius: '999px',
                }}
              >
                Yes, I&rsquo;m of legal age
              </button>
              <button
                onClick={handleDeny}
                className="px-8 py-3 text-sm font-medium tracking-wide border border-border text-text-secondary hover:text-text hover:border-gold transition-all duration-300 cursor-pointer"
                style={{ borderRadius: '999px', background: 'transparent' }}
              >
                No
              </button>
            </div>

            <p className="mt-7 text-text-muted text-xs">
              By entering, you agree to our Terms of Service. Please drink responsibly.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
