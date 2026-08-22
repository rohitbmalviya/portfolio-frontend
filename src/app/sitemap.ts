// ============================================================
//  sitemap.ts — Dynamic sitemap for SEO.
//
//  Every entry comes from the CMS. Page routes used to be hardcoded
//  ("/projects", "/blog"), which had two problems: pages the admin
//  created were never indexed, and if a page was renamed or
//  unpublished we kept advertising a URL that 404s. Now the page
//  list IS the source, so both follow automatically.
//
//  When the backend is down every list is [] — the sitemap falls back
//  to the home URL alone rather than crashing or emitting dead links.
// ============================================================

import type { MetadataRoute } from 'next';
import { getPages, getProjects, getBlogPosts } from '@/lib/api';
import { SITE_URL as BASE } from '@/lib/site';

export const revalidate = 600;

// Vercel kills a function at its duration limit. The API client allows a 20s
// timeout to survive a backend cold start, so this route needs headroom above
// that on the rare render that misses the cache.
export const maxDuration = 30;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, projects, posts] = await Promise.all([
    getPages(),
    getProjects(),
    getBlogPosts(),
  ]);

  // getPages() returns published pages only. "home" lives at "/" rather than
  // "/home" (see the redirect in (public)/[slug]/page.tsx), so it is mapped
  // to the bare origin.
  const pageRoutes: MetadataRoute.Sitemap = pages.map((p) => ({
    url: p.slug === 'home' ? BASE : `${BASE}/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: p.slug === 'home' ? 1 : 0.8,
  }));

  // If the API is unreachable pageRoutes is empty — still advertise the home
  // page so the sitemap is never completely blank.
  const staticRoutes: MetadataRoute.Sitemap =
    pageRoutes.length > 0
      ? pageRoutes
      : [{ url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 }];

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${BASE}/projects/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts
    .filter((p) => p.published)
    .map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  return [...staticRoutes, ...projectRoutes, ...blogRoutes];
}
