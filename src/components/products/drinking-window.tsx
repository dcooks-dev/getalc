'use client';

import { getDrinkingWindowStatus } from '@/lib/utils';

interface DrinkingWindowProps {
  vintage: number;
  start: number;
  end: number;
}

export default function DrinkingWindow({ vintage, start, end }: DrinkingWindowProps) {
  const currentYear = new Date().getFullYear();
  const totalSpan = end - vintage;
  const status = getDrinkingWindowStatus(start, end);

  const windowStart = ((start - vintage) / totalSpan) * 100;
  const windowEnd = ((end - vintage) / totalSpan) * 100;
  const currentPos = Math.min(Math.max(((currentYear - vintage) / totalSpan) * 100, 0), 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.2em] text-text-muted">Drinking Window</h3>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>

      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full" style={{ background: '#1A1A1A' }} />

        <div
          className="absolute h-1.5 rounded-full"
          style={{
            left: `${windowStart}%`,
            width: `${windowEnd - windowStart}%`,
            background: 'linear-gradient(to right, #B8892E, #D4A853)',
          }}
        />

        <div
          className="absolute w-3 h-3 rounded-full border-2 border-gold z-10"
          style={{
            left: `${currentPos}%`,
            transform: 'translateX(-50%)',
            background: currentPos >= windowStart && currentPos <= windowEnd ? '#D4A853' : '#333',
          }}
          title={`${currentYear}`}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{vintage}</span>
        <span className="text-text-secondary">{start}–{end}</span>
        <span>{end}</span>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed">
        This wine is best enjoyed between <span className="text-text">{start}</span> and{' '}
        <span className="text-text">{end}</span>. Currently{' '}
        <span className={status.color}>{status.label.toLowerCase()}</span>.
      </p>
    </div>
  );
}
