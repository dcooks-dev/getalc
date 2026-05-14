import { Utensils } from 'lucide-react';

// Order matters: more-specific strings before substrings (e.g. "oyster" before "fish",
// "game bird" before "game", "cheesecake" before "cheese").
const EMOJI_MAP: Array<[string, string]> = [
  // Shellfish
  ['oyster',        '🦪'],
  ['mussel',        '🦪'],
  ['lobster',       '🦞'],
  ['crayfish',      '🦞'],
  ['crab',          '🦀'],
  ['scallop',       '🐚'],
  ['shellfish',     '🐚'],
  ['seafood',       '🦐'],
  ['shrimp',        '🍤'],
  ['prawn',         '🍤'],
  // Fish
  ['caviar',        '🐟'],
  ['salmon',        '🐟'],
  ['tuna',          '🐟'],
  ['sole',          '🐟'],
  ['bass',          '🐟'],
  ['bouillabaisse', '🐟'],
  ['sushi',         '🍣'],
  ['fish',          '🐟'],
  // Game birds & poultry — "game bird" before "game" (deer)
  ['foie',          '🦆'],
  ['duck',          '🦆'],
  ['game bird',     '🦆'],
  ['game',          '🦌'],
  ['venison',       '🦌'],
  ['boar',          '🐗'],
  // Sausages & cured pork
  ['chorizo',       '🌭'],
  ['wurst',         '🌭'],
  ['sausage',       '🌭'],
  ['pig',           '🥓'],
  ['pork',          '🥓'],
  // Chicken & poultry
  ['coq',           '🍗'],
  ['chicken',       '🍗'],
  ['poultry',       '🍗'],
  // Lamb & bone-in cuts
  ['lamb',          '🍖'],
  ['osso',          '🍖'],
  ['rib',           '🍖'],
  // Beef & red meat
  ['wagyu',         '🥩'],
  ['bistecca',      '🥩'],
  ['schnitzel',     '🥩'],
  ['veal',          '🥩'],
  ['asado',         '🥩'],
  ['beef',          '🥩'],
  ['steak',         '🥩'],
  ['red meat',      '🥩'],
  ['charcuterie',   '🥩'],
  ['cured',         '🥩'],
  // Fungi
  ['truffle',       '🍄'],
  ['mushroom',      '🍄'],
  // Vegetables
  ['asparagus',     '🥦'],
  ['ratatouille',   '🍆'],
  ['vegetable',     '🥦'],
  ['patata',        '🥔'],
  ['potato',        '🥔'],
  ['chimichurri',   '🌿'],
  // Salads
  ['salad',         '🥗'],
  // Pasta & rice
  ['pasta',         '🍝'],
  ['risotto',       '🍝'],
  // Pizza, dumplings & bread
  ['pizza',         '🍕'],
  ['empanada',      '🥟'],
  ['pretzel',       '🥨'],
  ['bread',         '🍞'],
  // Desserts — "cheesecake" before "cheese", specific before general
  ['cheesecake',    '🍰'],
  ['ice cream',     '🍦'],
  ['vanilla',       '🍦'],
  ['gingerbread',   '🍪'],
  ['tart',          '🥧'],
  ['pie',           '🥧'],
  ['berry',         '🍓'],
  ['mango',         '🥭'],
  ['apple',         '🍎'],
  ['chocolate',     '🍫'],
  ['dessert',       '🍫'],
  // Spice & heat — "thai" before generic "spicy"
  ['thai',          '🌶️'],
  ['jalap',         '🌶️'],
  ['spiced',        '🌶️'],
  ['spicy',         '🌶️'],
  ['asian',         '🥢'],
  // Nuts
  ['nut',           '🥜'],
  // Cheese — named varieties before generic "cheese"
  ['cheddar',       '🧀'],
  ['gouda',         '🧀'],
  ['parmigiano',    '🧀'],
  ['parmesan',      '🧀'],
  ['pecorino',      '🧀'],
  ['castelmagno',   '🧀'],
  ['comté',         '🧀'],
  ['manchego',      '🧀'],
  ['brie',          '🧀'],
  ['cheese',        '🧀'],
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
