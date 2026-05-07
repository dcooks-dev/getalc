import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://getalc.vercel.app'),
  title: {
    default: 'GetAlc — Discover Premium Wines & Craft Beers',
    template: '%s | GetAlc',
  },
  description:
    'GetAlc is your editorial guide to premium wines and craft beers. Explore tasting notes, flavor profiles, food pairings, and curated recommendations from the world\'s finest producers.',
  keywords: ['wine', 'beer', 'craft beer', 'wine discovery', 'tasting notes', 'sommelier', 'premium alcohol'],
  authors: [{ name: 'GetAlc' }],
  creator: 'GetAlc',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://getalc.vercel.app',
    siteName: 'GetAlc',
    title: 'GetAlc — Discover Premium Wines & Craft Beers',
    description:
      'Editorial-grade wine and beer discovery. Explore flavor profiles, tasting notes, and curated pairings.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'GetAlc' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetAlc — Discover Premium Wines & Craft Beers',
    description: 'Editorial-grade wine and beer discovery.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-text antialiased">
        {children}
      </body>
    </html>
  );
}
