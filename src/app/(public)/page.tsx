// ============================================================
//  Home page — /
//  Rendered entirely from the CMS "home" page (GET /api/pages/home).
//  The home page must exist in the database (seeded / created in
//  admin). No inline static fallback — the CMS is the source of truth.
//  ISR-cached; an admin save invalidates it on demand via
//  /api/revalidate, so edits are live on the next request.
// ============================================================

import type { Metadata } from 'next';
import { getPage, getSiteSettings } from '@/lib/api';
import { SectionRenderer } from '@/components/sections/section-renderer';
import { SITE_TITLE } from '@/lib/site';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 600;

// Vercel kills a function at its duration limit. The API client allows a 20s
// timeout to survive a backend cold start, so this route needs headroom above
// that on the rare render that misses the cache.
export const maxDuration = 30;

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPage('home'), getSiteSettings()]);
  return buildPageMetadata({ page, settings, fallbackTitle: SITE_TITLE });
}

export default async function HomePage() {
  const page = await getPage('home');
  return <SectionRenderer sections={page?.sections ?? []} />;
}
