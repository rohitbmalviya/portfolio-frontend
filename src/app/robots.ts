// ============================================================
//  robots.ts — Dynamic robots.txt (replaces the static
//  public/robots.txt) so the sitemap URL is built from the
//  single shared SITE_URL constant instead of being duplicated.
// ============================================================

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
