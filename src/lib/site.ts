// ============================================================
//  lib/site.ts — Centralized site identity constants.
//  These are LAST-RESORT fallbacks only: wherever the caller has
//  server-side access to SiteSettings (from the CMS), prefer
//  settings.name / settings.ogTitle etc. over these constants.
//  Set NEXT_PUBLIC_SITE_OWNER in .env.local to adapt the fallback
//  without touching source files.
// ============================================================

export const SITE_OWNER =
  process.env.NEXT_PUBLIC_SITE_OWNER ?? 'Portfolio';

/** Full default <title> used on the root layout and the home page. */
export const SITE_TITLE = `${SITE_OWNER} — Full-Stack Engineer`;

/** Template used for page-level <title> tags: "%s — Owner". */
export const SITE_TITLE_TEMPLATE = `%s — ${SITE_OWNER}`;

/**
 * Public site base URL — infra constant, not CMS-driven.
 * Set NEXT_PUBLIC_SITE_URL in .env.local to pin it explicitly. Otherwise
 * we resolve the Vercel-provided domain (the production one, falling back to
 * the per-deployment URL on preview builds) before the hardcoded production
 * URL, so preview deployments serve an og:image URL that actually resolves —
 * link-preview scrapers will not follow a relative or dead absolute URL.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://rohitmalviya.dev');

// ── Display-name resolution (nav logo, 404 decorative line) ────

/**
 * Resolves the site owner's display name.
 * Fallback chain: SiteSettings.name → SITE_OWNER (env-configurable,
 * itself defaulting to the generic "Portfolio").
 */
export function resolveSiteName(name?: string | null): string {
  return name?.trim() || SITE_OWNER;
}

/**
 * Splits a display name into lowercased words for the mono logo
 * treatment (e.g. "Rohit Malviya" → ["rohit", "malviya"]). A
 * single-word name renders as a one-element array (no dot).
 * Never returns an empty array — falls back to ["portfolio"].
 */
export function siteNameToLogoWords(name: string): string[] {
  const words = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 ? words : ['portfolio'];
}
