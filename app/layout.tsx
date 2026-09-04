import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'Write Frankly — Private Journaling Companion',
  description: 'A private, unvarnished journaling companion for thinking out loud without performance, filtering, or fear of consequence.',
  applicationName: 'Frankly',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Frankly',
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
    title: 'Write Frankly — Private Journaling Companion',
    description: 'A private, unvarnished journaling companion for thinking out loud without performance, filtering, or fear of consequence.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Write Frankly — Private Journaling Companion',
    description: 'A private, unvarnished journaling companion for thinking out loud without performance, filtering, or fear of consequence.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
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
