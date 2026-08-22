// ============================================================
//  lib/collection-links.ts — resolve "back to <collection>" links
//  against the CMS instead of hardcoding them.
//
//  Detail pages used to link back with a literal href ("/projects",
//  "/blog"). Those are admin-owned CMS pages: rename or unpublish one
//  and the link 404s. The backend now pins the slug of pages marked
//  isSystem, but non-system pages can still move, and the label was
//  hardcoded too — so "Back to projects" stayed wrong after a rename.
//
//  This resolves both from the page list, which is ISR-cached and
//  tagged, so it costs nothing beyond a cache read.
// ============================================================

import { getPages } from './api';

export interface BackLink {
  href: string;
  label: string;
}

/** Fallback used whenever the collection's page is missing or unpublished. */
const HOME: BackLink = { href: '/', label: 'Back to home' };

/**
 * Resolve the back link for a collection detail page.
 *
 * @param slug Collection page slug, e.g. "projects" or "blog".
 * @returns The page's own href and title when it exists and is published;
 *          otherwise a link home, so a renamed page degrades to a working
 *          link rather than a dead one.
 */
export async function resolveBackLink(slug: string): Promise<BackLink> {
  const pages = await getPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) return HOME;

  // Prefer navLabel — it is what the admin chose to call the page in nav.
  const name = (page.navLabel ?? page.title).trim();
  return { href: `/${page.slug}`, label: `Back to ${name.toLowerCase()}` };
}
