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
  /** Explicit OG image URL, used when the CMS Page has no ogImage of its own.
   *  When omitted, no `images` entry is emitted at all and the card falls back
   *  to the generated app/opengraph-image.tsx. */
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
 *  og.images   = [{ url: page?.ogImage || ogImage, … }] — omitted entirely
 *                when neither is set, so the generated opengraph-image wins
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
  // No '/og-default.png' fallback: that file does not exist in public/, so it
  // produced a 404 og:image and killed the link preview. Any explicit `images`
  // entry also shadows app/opengraph-image.tsx — so when the CMS supplies no
  // image we omit the key and let the generated card be used.
  const imageUrl = page?.ogImage || ogImage;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      ...(imageUrl
        ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }
        : {}),
    },
  };
}
