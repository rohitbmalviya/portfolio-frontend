// ============================================================
//  lib/seo.ts — Shared metadata builder for CMS-driven pages.
//  Used by list/home/root pages whose metadata comes from the
//  backend CMS (Page.metaTitle / metaDescription / ogImage and
//  SiteSettings.ogTitle / ogDescription).
// ============================================================

import type { Metadata } from 'next';
import type { Page, SiteSettings } from './types';
import { OG_IMAGE_PATH, SITE_OWNER } from './site';

interface BuildPageMetadataOptions {
  page?: Page | null;
  settings?: SiteSettings | null;
  fallbackTitle: string;
  /** Explicit OG image URL, used when the CMS Page has no ogImage of its own.
   *  Falls back to the generated default card at OG_IMAGE_PATH. */
  ogImage?: string;
}

/**
 * Resolves Next.js Metadata for a CMS-driven page. The description is fully
 * backend-driven (CMS page → Site Settings); may be undefined when absent.
 *
 *  title       = page?.metaTitle || fallbackTitle
 *  description = page?.metaDescription || settings?.ogDescription
 *                || settings?.tagline || undefined
 *  og.title    = page?.metaTitle || `${fallbackTitle} — ${settings?.name ?? SITE_OWNER}`
 *  og.images   = [{ url: page?.ogImage || ogImage || OG_IMAGE_PATH, … }]
 */
export function buildPageMetadata({
  page,
  settings,
  fallbackTitle,
  ogImage,
}: BuildPageMetadataOptions): Metadata {
  const title = page?.metaTitle || fallbackTitle;
  const description =
    page?.metaDescription ||
    settings?.ogDescription ||
    settings?.tagline ||
    undefined;
  const ownerName = settings?.name || SITE_OWNER;
  const ogTitle = page?.metaTitle || `${fallbackTitle} — ${ownerName}`;
  // The old fallback was '/og-default.png', which does not exist in public/ —
  // it produced a 404 og:image and killed the link preview. OG_IMAGE_PATH is a
  // real generated card. It must be set explicitly: this `openGraph` object
  // replaces the root layout's wholesale, so anything not named here is lost.
  const imageUrl = page?.ogImage || ogImage || OG_IMAGE_PATH;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
  };
}
