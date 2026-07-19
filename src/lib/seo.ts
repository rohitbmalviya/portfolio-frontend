// ============================================================
//  lib/seo.ts — Shared metadata builder for CMS-driven pages.
//  Used by list/home/root pages whose metadata comes from the
//  backend CMS (Page.metaTitle / metaDescription / ogImage and
//  SiteSettings.ogTitle / ogDescription).
// ============================================================

import type { Metadata } from 'next';
import type { Page, SiteSettings } from './types';
import { SITE_OWNER } from './site';

interface BuildPageMetadataOptions {
  page?: Page | null;
  settings?: SiteSettings | null;
  fallbackTitle: string;
  /** Fallback OG image URL used when neither Page.ogImage nor the caller
   *  supplies one. Defaults to '/og-default.png'. */
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
 *  og.images   = [{ url: page?.ogImage || ogImage || '/og-default.png', … }]
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
  const imageUrl = page?.ogImage || ogImage || '/og-default.png';

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
