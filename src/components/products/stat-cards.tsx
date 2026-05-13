import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

export function StatCard({ label, value, sub, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-surface text-center',
        className
      )}
    >
      <span className="text-xs uppercase tracking-[0.15em] text-text-secondary mb-1">{label}</span>
      <span
        className="text-2xl font-bold text-text"
        style={{ fontFamily: 'var(--font-playfair-display)' }}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-text-secondary mt-0.5">{sub}</span>}
    </div>
  );
}

interface BeerStatsProps {
  abv: number;
  ibu: number;
  calories?: number;
  style: string;
}

export function BeerStats({ abv, ibu, calories, style }: BeerStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="ABV" value={`${abv.toFixed(1)}%`} sub="Alcohol" />
      <StatCard label="IBU" value={ibu.toString()} sub="Bitterness" />
      {calories ? (
        <StatCard label="Calories" value={calories.toString()} sub="Per 12oz" />
      ) : null}
      <StatCard label="Style" value={style} />
    </div>
  );
}

interface WineStatsProps {
  alcohol: number;
  vintage: number;
  drinkStart: number;
  drinkEnd: number;
  region: string;
}

export function WineStats({ alcohol, vintage, drinkStart, drinkEnd, region }: WineStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="ABV" value={`${alcohol.toFixed(1)}%`} sub="Alcohol" />
      <StatCard label="Vintage" value={vintage.toString()} />
      <StatCard label="Drink Window" value={`${drinkStart}–${drinkEnd}`} />
      <StatCard label="Region" value={region} />
    </div>
  );
}
