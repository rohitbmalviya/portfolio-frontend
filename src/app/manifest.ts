// ============================================================
//  manifest.ts — Dynamic Web App Manifest (PWA / Android icons).
//  Follows the same pattern as robots.ts/sitemap.ts: name is
//  resolved from SiteSettings when available, falling back to
//  the shared SITE_OWNER constant. theme_color/background_color
//  mirror --bg (dark) and --accent in globals.css.
// ============================================================

import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/api';
import { SITE_OWNER, resolveSiteName } from '@/lib/site';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const ownerName = resolveSiteName(settings?.name);

  return {
    name: `${ownerName} — Full-Stack Engineer`,
    short_name: settings?.name ?? SITE_OWNER,
    description: settings?.ogDescription ?? settings?.tagline ?? undefined,
    start_url: '/',
    display: 'standalone',
    // Mirrors --bg (dark) in globals.css.
    background_color: '#0B0F17',
    // Mirrors --accent in globals.css.
    theme_color: '#0B0F17',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
