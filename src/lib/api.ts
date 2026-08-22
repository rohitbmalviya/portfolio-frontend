// ============================================================
//  lib/api.ts — Typed fetch client for the portfolio backend
//  Base URL: NEXT_PUBLIC_API_URL (env)
//
//  CACHING — ISR + on-demand invalidation.
//  Public reads are cached and tagged. Two things invalidate them:
//    1. The time window below (a safety net).
//    2. An admin save, which POSTs /api/revalidate and calls
//       revalidateTag — so an edit is live on the next request,
//       with no window to wait out.
//
//  This matters for more than freshness. The backend runs on Cloud
//  Run with min-instances=0 and Neon autosuspends, so a cold start
//  measured 16.9s end-to-end. Serving a cached render means visitors
//  never wait on that — the origin wakes in the background instead
//  of blocking the page.
//
//  Graceful fallback: try/catch returns null on error so the
//  app still compiles & runs with empty states if API is down.
//
//  Response envelope: every backend endpoint returns { data: T }.
//  apiFetch unwraps the envelope and returns T directly.
// ============================================================

import type {
  Page,
  Project,
  BlogPost,
  Skill,
  SkillGroupSection,
  Experience,
  Education,
  Achievement,
  SiteSettings,
  NavPage,
  ConfigOption,
  Configuration,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Base path for calls that originate in the BROWSER.
 *
 * Server-side reads (apiFetch below) must use the absolute BASE_URL — there is
 * no origin to be relative to. But a fetch running in the browser should go
 * through the same-origin `/backend-api/*` rewrite (see next.config.ts) that
 * lib/admin-api.ts uses, rather than hitting the backend host directly:
 *
 *   • no cross-origin preflight, no second DNS + TLS handshake
 *   • the backend URL is never exposed in the network tab
 *   • one consistent path for every browser-originated request
 *
 * The rewrite maps /backend-api/:path* → ${NEXT_PUBLIC_API_URL}/api/:path*,
 * so callers pass the path WITHOUT the leading `/api`.
 *
 * These helpers are isomorphic — `submitContact` and `getConfigOptions` are
 * only called from client components today, but the server branch keeps them
 * correct if that ever changes.
 */
function browserBase(): string {
  return typeof window === 'undefined' ? `${BASE_URL}/api` : '/backend-api';
}

// ── Cache tags ────────────────────────────────────────────────

/**
 * Tags attached to cached reads so an admin save can invalidate exactly the
 * content it touched. Shared with app/api/revalidate/route.ts, which is the
 * only thing that calls revalidateTag.
 */
export const CACHE_TAGS = {
  pages: 'pages',
  projects: 'projects',
  blog: 'blog',
  skills: 'skills',
  experience: 'experience',
  education: 'education',
  achievements: 'achievements',
  settings: 'settings',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/** Every tag — used when a mutation could plausibly affect any page. */
export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS);

/**
 * Time-based revalidation window (seconds).
 *
 * ISR is stale-while-revalidate: the cached page is served immediately and the
 * re-render happens in the background, so this window has NO effect on what a
 * visitor waits for. It only controls how often the origin is asked, which
 * makes a moderate value better than a long one:
 *
 *   • Admin saves already invalidate on demand, so freshness isn't the driver.
 *   • The real risk is a bad render being cached — e.g. the Vercel build
 *     prerenders `/` while the backend is cold, baking an empty page. A
 *     shorter window bounds how long that persists.
 *   • Periodic background revalidation also keeps Cloud Run and Neon warm,
 *     which shortens the cold starts that caused this in the first place.
 */
const REVALIDATE_SECONDS = 600;

// ── Low-level fetch helper ────────────────────────────────────

// All backend responses are wrapped: { data: T }
interface ApiEnvelope<T> {
  data: T;
}

/**
 * Per-request timeout.
 *
 * The old value was 8s with one retry — a 16.3s total budget. A measured cold
 * start (Cloud Run boot + Prisma connect + Neon wake) took 16.9s, so BOTH
 * attempts aborted before the backend replied and the page rendered empty.
 * 20s clears that with margin.
 *
 * Upper bound is Vercel's function limit, so public routes that can miss the
 * cache also set `export const maxDuration` — see app/(public)/*.
 */
const FETCH_TIMEOUT_MS = 20_000;

/**
 * Retries apply to fast failures (5xx) only, NOT timeouts.
 *
 * A retry after a 20s abort would double the budget and blow the function
 * limit for no gain: if the backend didn't answer in 20s it is not going to
 * answer in the next 20s either. A 5xx comes back immediately, so retrying
 * that is cheap and often works.
 */
const MAX_5XX_RETRIES = 1;
const RETRY_BACKOFF_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiFetch<T>(path: string, tags: CacheTag[]): Promise<T | null> {
  for (let retry = 0; retry <= MAX_5XX_RETRIES; retry++) {
    // Abort the request if the backend hangs past the timeout.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        // Cached and tagged — invalidated by an admin save via
        // /api/revalidate, or by the window as a backstop.
        next: { revalidate: REVALIDATE_SECONDS, tags },
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        // 404 is a normal "not found" — return null, don't log/retry.
        if (res.status === 404) return null;
        // 5xx is usually transient and fails fast, so a retry is cheap.
        if (res.status >= 500 && retry < MAX_5XX_RETRIES) {
          await delay(RETRY_BACKOFF_MS);
          continue;
        }
        console.error(`[api] ${path} → HTTP ${res.status}`);
        return null;
      }

      // Unwrap { data: T } envelope returned by every backend controller
      const envelope = (await res.json()) as ApiEnvelope<T>;
      return envelope.data;
    } catch (err) {
      clearTimeout(timer);
      // Timeout (abort) or network failure. No retry — we have already spent
      // the full timeout, and retrying would exceed the function budget.
      // Returning null lets the page render its empty state; the stale
      // cached copy keeps serving visitors in the meantime.
      console.warn(`[api] fetch failed for ${path}:`, (err as Error).message);
      return null;
    }
  }
  return null;
}

// ── Pages ─────────────────────────────────────────────────────

/**
 * GET /api/pages/:slug — returns the page with its ordered enabled sections.
 * Used for the Home page and any CMS-driven page.
 */
export async function getPage(slug: string): Promise<Page | null> {
  return apiFetch<Page>(`/api/pages/${slug}`, [CACHE_TAGS.pages]);
}

/**
 * GET /api/pages — returns all published pages (for nav/sitemap).
 */
export async function getPages(): Promise<Page[]> {
  const result = await apiFetch<Page[]>('/api/pages', [CACHE_TAGS.pages]);
  return result ?? [];
}

// ── Projects ──────────────────────────────────────────────────

/**
 * GET /api/projects — returns all published projects ordered by `order`.
 */
export async function getProjects(): Promise<Project[]> {
  const result = await apiFetch<Project[]>('/api/projects', [CACHE_TAGS.projects]);
  return result ?? [];
}

/**
 * GET /api/projects/featured — returns only featured projects.
 */
export async function getFeaturedProjects(): Promise<Project[]> {
  const result = await apiFetch<Project[]>('/api/projects?featured=true', [CACHE_TAGS.projects]);
  return result ?? [];
}

/**
 * GET /api/projects/:slug — returns a single project by slug.
 */
export async function getProject(slug: string): Promise<Project | null> {
  return apiFetch<Project>(`/api/projects/${slug}`, [CACHE_TAGS.projects]);
}

// ── Blog ──────────────────────────────────────────────────────

/**
 * GET /api/blog — returns all published blog posts, newest first.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const result = await apiFetch<BlogPost[]>('/api/blog', [CACHE_TAGS.blog]);
  return result ?? [];
}

/**
 * GET /api/blog/:slug — returns a single blog post by slug.
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return apiFetch<BlogPost>(`/api/blog/${slug}`, [CACHE_TAGS.blog]);
}

// ── Skills ────────────────────────────────────────────────────

/**
 * GET /api/skills/grouped — returns skills pre-grouped in canonical order
 * (Languages → Frontend → Backend → Data → Cloud/DevOps → AI), empty groups omitted.
 * Returns [] when the API is unreachable; callers should apply a local fallback.
 */
export async function getSkillsGrouped(): Promise<SkillGroupSection[]> {
  const result = await apiFetch<SkillGroupSection[]>('/api/skills/grouped', [CACHE_TAGS.skills]);
  return result ?? [];
}

// ── Experience ────────────────────────────────────────────────

export async function getExperience(): Promise<Experience[]> {
  const result = await apiFetch<Experience[]>('/api/experience', [CACHE_TAGS.experience]);
  return result ?? [];
}

// ── Education ──────────────────────────────────────────────────

export async function getEducation(): Promise<Education[]> {
  const result = await apiFetch<Education[]>('/api/education', [CACHE_TAGS.education]);
  return result ?? [];
}

// ── Achievements ──────────────────────────────────────────────

export async function getAchievements(): Promise<Achievement[]> {
  const result = await apiFetch<Achievement[]>('/api/achievements', [CACHE_TAGS.achievements]);
  return result ?? [];
}

// ── Site Settings ─────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return apiFetch<SiteSettings>('/api/settings', [CACHE_TAGS.settings]);
}

// ── Nav ───────────────────────────────────────────────────────

/**
 * GET /api/pages/nav (PUBLIC) — returns { slug, title, navLabel, navOrder }[]
 * for pages where showInNav=true and published=true, ordered by navOrder.
 * Returns [] if the API is unreachable so the caller can fall back to a
 * static set.
 */
export async function getNav(): Promise<NavPage[]> {
  const result = await apiFetch<NavPage[]>('/api/pages/nav', [CACHE_TAGS.pages]);
  return result ?? [];
}

// ── Config options (public, no auth) ──────────────────────────

/**
 * GET /api/config/:key — returns the items array for a config key.
 * Public endpoint (no auth). Returns [] on error or if API is unreachable.
 * Called from client components that need to populate dropdowns, so it routes
 * through the same-origin proxy — see browserBase().
 */
export async function getConfigOptions(key: string): Promise<ConfigOption[]> {
  try {
    const res = await fetch(`${browserBase()}/config/${key}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const envelope = (await res.json()) as ApiEnvelope<Configuration>;
    return envelope.data?.items ?? [];
  } catch {
    return [];
  }
}

// ── Contact (public form submission) ─────────────────────────

/**
 * POST /api/contact — submits a contact form.
 * Uses a plain fetch (not apiFetch) because this is a client-side
 * mutation, not a server-side read. Routes through the same-origin
 * proxy — see browserBase(). Returns true on success, false on any
 * network or HTTP error.
 *
 * `website` is an optional honeypot field — always sent empty by the
 * real form; the backend silently drops submissions where it's non-empty.
 */
export async function submitContact(payload: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  website?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${browserBase()}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type { NavPage, ConfigOption, Configuration };
