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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
