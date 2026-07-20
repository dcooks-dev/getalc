import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ý]/g, 'y')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export function formatAlcohol(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function getCountryFlag(countryCode: string): string {
  const code = countryCode.toUpperCase();
  return code
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('');
}

export function getCountryName(code: string): string {
  const map: Record<string, string> = {
    fr: 'France', it: 'Italy', es: 'Spain', de: 'Germany', pt: 'Portugal',
    ar: 'Argentina', us: 'United States', au: 'Australia', nz: 'New Zealand',
    cl: 'Chile', za: 'South Africa', at: 'Austria', hu: 'Hungary',
    gr: 'Greece', ro: 'Romania', bg: 'Bulgaria', hr: 'Croatia',
    si: 'Slovenia', rs: 'Serbia', md: 'Moldova', ge: 'Georgia',
    am: 'Armenia', il: 'Israel', lb: 'Lebanon', tr: 'Turkey',
    gb: 'United Kingdom', be: 'Belgium',
  };
  return map[code.toLowerCase()] ?? code.toUpperCase();
}

export const WINE_COLOR_LABELS: Record<string, string> = {
  red: 'Red', white: 'White', rose: 'Rosé', sparkling: 'Sparkling',
  dessert: 'Dessert', fortified: 'Fortified',
};

export const WINE_COLOR_CLASSES: Record<string, string> = {
  red: 'bg-[#F3E3E5] text-[#9B2D3A] border-[#EBD1D5]',
  white: 'bg-[#F5F0DE] text-[#897020] border-[#EDE4C4]',
  rose: 'bg-[#FBE9EE] text-[#BF4E6E] border-[#F3D3DD]',
  sparkling: 'bg-[#F6EED9] text-[#986A14] border-[#EEE1C0]',
  dessert: 'bg-[#F7E9DC] text-[#A65B20] border-[#EFD8C4]',
  fortified: 'bg-[#EFE6F3] text-[#6E4A86] border-[#E0D2EA]',
};

export const WINE_IMAGE_MAP: Record<string, string> = {
  red: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
  white: 'https://images.unsplash.com/photo-1566275529824-cca6d008f3bf?w=800&q=80',
  rose: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  sparkling: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80',
  dessert: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
  fortified: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
};

export const BEER_IMAGE_MAP: Record<string, string> = {
  light: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80',
  dark: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&q=80',
  craft: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=800&q=80',
};

export function getBeerImage(style: string): string {
  const s = style.toLowerCase();
  if (s.includes('stout') || s.includes('porter') || s.includes('dark') || s.includes('brown')) {
    return BEER_IMAGE_MAP.dark;
  }
  if (s.includes('ipa') || s.includes('pale') || s.includes('saison') || s.includes('wheat')) {
    return BEER_IMAGE_MAP.craft;
  }
  return BEER_IMAGE_MAP.light;
}

export function formatPrice(price: number, currency?: string | null): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', NZD: 'NZ$',
  };
  const symbol = currency ? (symbols[currency.toUpperCase()] ?? `${currency} `) : '$';
  return `${symbol}${price.toFixed(2)}`;
}

export function getDrinkingWindowStatus(start: number, end: number): {
  label: string;
  color: string;
} {
  const year = new Date().getFullYear();
  if (year < start) return { label: 'Too Young', color: 'text-blue-400' };
  if (year > end) return { label: 'Past Peak', color: 'text-red-400' };
  const midpoint = (start + end) / 2;
  if (year < midpoint) return { label: 'Drinking Well', color: 'text-gold' };
  return { label: 'Near Peak', color: 'text-gold' };
}
