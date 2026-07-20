'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FlavorBar {
  label: string;
  value: number;
  max?: number;
}

interface FlavorBarsProps {
  bars: FlavorBar[];
  className?: string;
}

export default function FlavorBars({ bars, className }: FlavorBarsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {bars.map((bar, index) => {
        const pct = ((bar.value ?? 0) / (bar.max ?? 10)) * 100;
        return (
          <div key={bar.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs uppercase tracking-[0.15em] text-text-secondary font-medium">
                {bar.label}
              </span>
              <span className="text-xs text-text-secondary tabular-nums">{bar.value}/{bar.max ?? 10}</span>
            </div>
            <div className="relative h-1.5 rounded-full flavor-bar-track overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.1 + index * 0.08, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: 'linear-gradient(to right, #7E2430, #9B2D3A, #B84B58)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WineFlavorBars({
  sweetness, acidity, tannins, alcohol, body, finish, className,
}: {
  sweetness: number; acidity: number; tannins: number;
  alcohol: number; body: number; finish: number;
  className?: string;
}) {
  return (
    <FlavorBars
      className={className}
      bars={[
        { label: 'Sweetness', value: sweetness },
        { label: 'Acidity', value: acidity },
        { label: 'Tannins', value: tannins },
        { label: 'Alcohol', value: alcohol },
        { label: 'Body', value: body },
        { label: 'Finish', value: finish },
      ]}
    />
  );
}

export function BeerFlavorBars({
  bitterness, sweetness, body, carbonation, aroma, finish, className,
}: {
  bitterness: number; sweetness: number; body: number;
  carbonation: number; aroma: number; finish: number;
  className?: string;
}) {
  return (
    <FlavorBars
      className={className}
      bars={[
        { label: 'Bitterness', value: bitterness },
        { label: 'Sweetness', value: sweetness },
        { label: 'Body', value: body },
        { label: 'Carbonation', value: carbonation },
        { label: 'Aroma', value: aroma },
        { label: 'Finish', value: finish },
      ]}
    />
  );
}
