import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9001';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'finLab – Personal Finance Management Made Simple',
    template: '%s | finLab',
  },
  description:
    'Take control of your finances with finLab. Track income and expenses, manage accounts, plan budgets, monitor savings goals and understand your financial activity in one place.',
  keywords: [
    'personal finance',
    'budget planner',
    'expense tracker',
    'money management',
    'financial ledger',
    'savings goals',
    'fintech SaaS',
    'account manager',
  ],
  authors: [{ name: 'finLab Team' }],
  creator: 'finLab',
  publisher: 'finLab',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'finLab – Personal Finance Management Made Simple',
    description:
      'Take control of your financial life with one intelligent workspace. Track expenses, manage accounts, plan budgets and build better financial habits with finLab.',
    url: siteUrl,
    siteName: 'finLab',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'finLab – Personal Finance Management Made Simple',
    description:
      'Take control of your financial life with one intelligent workspace. Track expenses, manage accounts, plan budgets and build better financial habits with finLab.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'finLab',
      alternateName: 'finLab SaaS',
      url: siteUrl,
      description:
        'Personal finance management platform for tracking income, expenses, accounts, and budgets.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'finLab',
      url: siteUrl,
      logo: `${siteUrl}/favicon.ico`,
      description: 'finLab develops intelligent personal finance management software.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'finLab',
      operatingSystem: 'Web',
      applicationCategory: 'FinanceApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'A comprehensive personal finance workspace featuring multi-account ledgers, real-time category budgeting, recurring schedule automations, and savings goal milestones.',
    },
  ];

  return (
    <html lang="en" className="h-full scroll-smooth antialiased font-sans" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text)] transition-colors duration-200 font-sans"
        style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
