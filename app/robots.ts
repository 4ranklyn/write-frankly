import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://write-frankly.web.app';

  return {
    rules: [
      {
        userAgent: [
          '*',
          'Googlebot',
          'GPTBot',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
        ],
        allow: ['/', '/privacy', '/terms'],
        disallow: ['/api/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
