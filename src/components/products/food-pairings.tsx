import { Utensils } from 'lucide-react';

// Order matters: more-specific strings before substrings (e.g. "oyster" before "fish").
const EMOJI_MAP: Array<[string, string]> = [
  ['oyster',      '🦪'],
  ['lobster',     '🦞'],
  ['crab',        '🦀'],
  ['scallop',     '🐚'],
  ['shellfish',   '🐚'],
  ['shrimp',      '🍤'],
  ['prawn',       '🍤'],
  ['salmon',      '🐟'],
  ['tuna',        '🐟'],
  ['fish',        '🐟'],
  ['duck',        '🦆'],
  ['venison',     '🦌'],
  ['game',        '🦌'],
  ['lamb',        '🍖'],
  ['pork',        '🥓'],
  ['chicken',     '🍗'],
  ['poultry',     '🍗'],
  ['beef',        '🥩'],
  ['steak',       '🥩'],
  ['red meat',    '🥩'],
  ['charcuterie', '🥩'],
  ['truffle',     '🍄'],
  ['mushroom',    '🍄'],
  ['asparagus',   '🥦'],
  ['salad',       '🥗'],
  ['pasta',       '🍝'],
  ['risotto',     '🍝'],
  ['pizza',       '🍕'],
  ['bread',       '🍞'],
  ['chocolate',   '🍫'],
  ['dessert',     '🍫'],
  ['asian',       '🥢'],
  ['spicy',       '🌶️'],
  ['nut',         '🥜'],
  ['cheese',      '🧀'],
];

function getEmoji(pairing: string): string {
  const lower = pairing.toLowerCase();
  for (const [keyword, emoji] of EMOJI_MAP) {
    if (lower.includes(keyword)) return emoji;
  }
  return '🍽️';
}

interface FoodPairingsProps {
  pairings: string[];
}

export default function FoodPairings({ pairings }: FoodPairingsProps) {
  if (!pairings?.length) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2">
        <Utensils size={12} />
        Food Pairings
      </h3>
      <div className="flex flex-wrap gap-2">
        {pairings.map((p) => (
          <span
            key={p}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:border-gold hover:text-text transition-colors duration-200"
          >
            <span aria-hidden="true">{getEmoji(p)}</span>
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
