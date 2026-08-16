// ============================================================
//  Home page — /
//  Rendered entirely from the CMS "home" page (GET /api/pages/home).
//  The home page must exist in the database (seeded / created in
//  admin). No inline static fallback — the CMS is the source of truth.
//  Rendered on every request — no caching, always live API data.
// ============================================================

import type { Metadata } from 'next';
import { getPage, getSiteSettings } from '@/lib/api';
import { SectionRenderer } from '@/components/sections/section-renderer';
import { SITE_TITLE } from '@/lib/site';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPage('home'), getSiteSettings()]);
  return buildPageMetadata({ page, settings, fallbackTitle: SITE_TITLE });
}

export default async function HomePage() {
  const page = await getPage('home');
  return <SectionRenderer sections={page?.sections ?? []} />;
}
