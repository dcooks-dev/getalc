import { Utensils } from 'lucide-react';

interface FoodPairingsProps {
  pairings: string[];
  pairingText?: string;
}

export default function FoodPairings({ pairings, pairingText }: FoodPairingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2">
        <Utensils size={12} />
        Food Pairings
      </h3>

      {pairings?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pairings.map((p) => (
            <span
              key={p}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:border-gold hover:text-text transition-colors duration-200"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {pairingText && (
        <p className="text-sm text-text-secondary leading-relaxed">{pairingText}</p>
      )}
    </div>
  );
}
