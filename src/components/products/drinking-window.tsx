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

  const windowStartPct = ((start - vintage) / totalSpan) * 100;
  const currentPct = Math.min(Math.max(((currentYear - vintage) / totalSpan) * 100, 0), 100);
  const dotInWindow = currentPct >= windowStartPct;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary">Drinking Window</h3>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>

      {/* Track area — extra top padding gives room for the "Today" label */}
      <div className="relative pt-6">
        {/* "Today · YEAR" label pinned above the dot */}
        <div
          className="absolute top-0 text-xs text-text-secondary whitespace-nowrap"
          style={{
            left: `${currentPct}%`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        >
          Today · {currentYear}
        </div>

        <div className="relative h-5 flex items-center">
          {/* Grey segment: vintage → peak window start (too young) */}
          {windowStartPct > 0 && (
            <div
              className="absolute h-1.5"
              style={{
                left: 0,
                width: `${windowStartPct}%`,
                background: '#2A2A2A',
                borderRadius: '9999px 0 0 9999px',
              }}
            />
          )}

          {/* Gold segment: peak window start → end (drinking window) */}
          <div
            className="absolute h-1.5"
            style={{
              left: `${windowStartPct}%`,
              width: `${100 - windowStartPct}%`,
              background: 'linear-gradient(to right, #B8892E, #D4A853)',
              borderRadius: windowStartPct > 0 ? '0 9999px 9999px 0' : '9999px',
            }}
          />

          {/* Dot — non-interactive, marks where 'now' sits on the timeline */}
          <div
            className="absolute w-3 h-3 rounded-full border-2 border-gold z-10"
            style={{
              left: `${currentPct}%`,
              transform: 'translateX(-50%)',
              background: dotInWindow ? '#D4A853' : '#2A2A2A',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Edge labels — "Vintage YYYY" on left, end year on right, middle label removed */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>Vintage {vintage}</span>
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
