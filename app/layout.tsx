import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'WriteFrankly — Private Journaling Companion',
  description: 'A private, unvarnished journaling companion for thinking out loud without performance, filtering, or fear of consequence.',
  openGraph: {
    title: 'WriteFrankly — Private Journaling Companion',
    description: 'A private, unvarnished journaling companion for thinking out loud without performance, filtering, or fear of consequence.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WriteFrankly — Private Journaling Companion',
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
                  var g = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null));
                  if (!g) return;
                  var _fetch = typeof g.fetch === 'function' ? g.fetch.bind(g) : null;
                  
                  function setupFetchAccessor(target) {
                    if (!target) return;
                    try {
                      Object.defineProperty(target, 'fetch', {
                        get: function() {
                          return _fetch;
                        },
                        set: function(fn) {
                          _fetch = fn;
                        },
                        configurable: true,
                        enumerable: true
                      });
                    } catch (e) {}
                  }

                  setupFetchAccessor(g);
                  try {
                    var p = g;
                    while (p && p !== Object.prototype) {
                      setupFetchAccessor(p);
                      p = Object.getPrototypeOf(p);
                    }
                  } catch (e) {}
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
