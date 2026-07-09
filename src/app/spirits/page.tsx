import type { Metadata } from 'next';
import ComingSoon from '@/components/coming-soon';

export const metadata: Metadata = {
  title: 'Spirits — Coming Soon | GetAlc',
  description: 'A curated spirits collection is coming soon to GetAlc.',
};

export default function SpiritsPage() {
  return <ComingSoon category="Spirits" />;
}
