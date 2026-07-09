import type { Metadata } from 'next';
import ComingSoon from '@/components/coming-soon';

export const metadata: Metadata = {
  title: 'Craft Beer — Coming Soon | GetAlc',
  description: 'A curated craft beer collection is coming soon to GetAlc.',
};

export default function BeersPage() {
  return <ComingSoon category="Beers" />;
}
