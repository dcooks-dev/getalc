import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://getalc.vercel.app';

  const { data: wines } = await supabase
    .from('wines_v2')
    .select('id, created_at')
    .eq('needs_reenrichment', false);

  const wineUrls: MetadataRoute.Sitemap = (wines ?? []).map((w) => ({
    url: `${baseUrl}/wines/${w.id}`,
    lastModified: new Date(w.created_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/wines`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/beers`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/spirits`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ...wineUrls,
  ];
}
