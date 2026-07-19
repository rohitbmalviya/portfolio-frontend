// ============================================================
//  sitemap.ts — Dynamic sitemap for SEO.
//  Dynamic entries (projects, posts) use whatever the API returns.
//  When the backend is down both lists are [] and only the static
//  routes appear — no crash, just fewer entries.
// ============================================================

import type { MetadataRoute } from 'next';
import { getProjects, getBlogPosts } from '@/lib/api';
import { SITE_URL as BASE } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([getProjects(), getBlogPosts()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/projects`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ];

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
