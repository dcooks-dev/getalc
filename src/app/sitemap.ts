import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://getalc.vercel.app';

  const [{ data: wines }, { data: beers }] = await Promise.all([
    supabase.from('wines').select('slug, created_at'),
    supabase.from('beers').select('slug, created_at'),
  ]);

  const wineUrls: MetadataRoute.Sitemap = (wines ?? []).map((w) => ({
    url: `${baseUrl}/wines/${w.slug}`,
    lastModified: new Date(w.created_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const beerUrls: MetadataRoute.Sitemap = (beers ?? []).map((b) => ({
    url: `${baseUrl}/beers/${b.slug}`,
    lastModified: new Date(b.created_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/wines`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/beers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...wineUrls,
    ...beerUrls,
  ];
}
