import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://write-frankly.web.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Write-Frankly | Zero-Knowledge Private Journal with AI Debrief',
  description: 'A privacy-first personal journal combining client-side zero-knowledge encryption with Frankly, an empathetic on-device AI debrief companion.',
  applicationName: 'Write-Frankly',
  authors: [{ name: 'Write-Frankly Team' }],
  keywords: [
    'zero-knowledge journal',
    'private journal',
    'AI debrief',
    'AES-GCM encryption',
    'client-side encryption',
    'Frankly',
    'empathetic AI companion',
    'privacy first journal',
    'PWA journal',
    'secure reflection',
  ],
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Write-Frankly',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Write-Frankly | Zero-Knowledge Private Journal with AI Debrief',
    description: 'A privacy-first personal journal combining client-side zero-knowledge encryption with Frankly, an empathetic on-device AI debrief companion.',
    url: '/',
    siteName: 'Write-Frankly',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Write-Frankly Zero-Knowledge Private Journal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Write-Frankly | Zero-Knowledge Private Journal with AI Debrief',
    description: 'A privacy-first personal journal combining client-side zero-knowledge encryption with Frankly, an empathetic on-device AI debrief companion.',
    images: ['/icon-512.png'],
  },
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Write-Frankly',
      operatingSystem: 'Web, Progressive Web App (PWA)',
      applicationCategory: 'LifestyleApplication, ProductivityApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: 'End-to-end encrypted journal featuring an AI debrief companion.',
      softwareVersion: '0.1.0',
      featureList: [
        'Client-side zero-knowledge key derivation',
        'AES-GCM encrypted persistence',
        'Empathetic AI debrief companion (Frankly)',
        'Multi-turn reflection hub with Gemini fallback ladder',
        'Ephemeral in-memory guest mode',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does Write-Frankly guarantee privacy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Write-Frankly employs client-side zero-knowledge key derivation and authenticated AES-GCM encryption. Journal entries and personal reflections are encrypted directly on the client device before persistence to Firestore, ensuring plaintext is never stored or exposed to database administrators.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I try Frankly without an account?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Write-Frankly provides a private, 1-entry ephemeral guest mode requiring zero authentication or credential storage. You can freely reflect, debrief with Frankly, and export your session before exiting.',
          },
        },
        {
          '@type': 'Question',
          name: 'What AI models power the Frankly companion?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Frankly is powered by the Google Gemini API (gemini-3.6-flash, gemini-3.1-flash-lite, and gemini-3.7-flash resilient fallback ladders) executing server-side with strict PII-scrubbing and ephemeral in-memory debrief handling.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdSchema),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window === 'undefined') return;
                  var _fetch = window.fetch ? window.fetch.bind(window) : null;
                  function makeWritable(obj) {
                    if (!obj) return;
                    try {
                      Object.defineProperty(obj, 'fetch', {
                        get: function() { return _fetch; },
                        set: function(val) { _fetch = val; },
                        configurable: true,
                        enumerable: true
                      });
                    } catch (e) {}
                  }
                  makeWritable(window);
                  try {
                    var proto = Object.getPrototypeOf(window);
                    while (proto && proto !== Object.prototype) {
                      makeWritable(proto);
                      proto = Object.getPrototypeOf(proto);
                    }
                  } catch (e) {}
                  if (typeof Window !== 'undefined' && Window.prototype) {
                    makeWritable(Window.prototype);
                  }
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="pt-safe pb-safe pl-safe pr-safe min-h-screen">
        {children}
      </body>
    </html>
  );
}
