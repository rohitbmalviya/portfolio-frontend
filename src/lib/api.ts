// ============================================================
//  lib/api.ts — Typed fetch client for the portfolio backend
//  Base URL: NEXT_PUBLIC_API_URL (env)
//  All public reads are uncached (`cache: 'no-store'`) — every
//  request hits the live API so a CMS edit is visible immediately,
//  with no revalidation window to wait out.
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

// ── Low-level fetch helper ────────────────────────────────────

// All backend responses are wrapped: { data: T }
interface ApiEnvelope<T> {
  data: T;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2; // initial try + 1 retry on transient failures

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiFetch<T>(path: string): Promise<T | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Abort the request if the backend hangs past the timeout.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        // Never cached — read straight from the API on every request.
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        // 404 is a normal "not found" — return null, don't log/retry.
        if (res.status === 404) return null;
        // Retry once on transient 5xx, otherwise give up gracefully.
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          await delay(300 * attempt);
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
      // Network failure or timeout (abort) — retry once, then give up.
      if (attempt < MAX_ATTEMPTS) {
        await delay(300 * attempt);
        continue;
      }
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
  return apiFetch<Page>(`/api/pages/${slug}`);
}

/**
 * GET /api/pages — returns all published pages (for nav/sitemap).
 */
export async function getPages(): Promise<Page[]> {
  const result = await apiFetch<Page[]>('/api/pages');
  return result ?? [];
}

// ── Projects ──────────────────────────────────────────────────

/**
 * GET /api/projects — returns all published projects ordered by `order`.
 */
export async function getProjects(): Promise<Project[]> {
  const result = await apiFetch<Project[]>('/api/projects');
  return result ?? [];
}

/**
 * GET /api/projects/featured — returns only featured projects.
 */
export async function getFeaturedProjects(): Promise<Project[]> {
  const result = await apiFetch<Project[]>('/api/projects?featured=true');
  return result ?? [];
}

/**
 * GET /api/projects/:slug — returns a single project by slug.
 */
export async function getProject(slug: string): Promise<Project | null> {
  return apiFetch<Project>(`/api/projects/${slug}`);
}

// ── Blog ──────────────────────────────────────────────────────

/**
 * GET /api/blog — returns all published blog posts, newest first.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const result = await apiFetch<BlogPost[]>('/api/blog');
  return result ?? [];
}

/**
 * GET /api/blog/:slug — returns a single blog post by slug.
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return apiFetch<BlogPost>(`/api/blog/${slug}`);
}

// ── Skills ────────────────────────────────────────────────────

/**
 * GET /api/skills/grouped — returns skills pre-grouped in canonical order
 * (Languages → Frontend → Backend → Data → Cloud/DevOps → AI), empty groups omitted.
 * Returns [] when the API is unreachable; callers should apply a local fallback.
 */
export async function getSkillsGrouped(): Promise<SkillGroupSection[]> {
  const result = await apiFetch<SkillGroupSection[]>('/api/skills/grouped');
  return result ?? [];
}

// ── Experience ────────────────────────────────────────────────

export async function getExperience(): Promise<Experience[]> {
  const result = await apiFetch<Experience[]>('/api/experience');
  return result ?? [];
}

// ── Education ──────────────────────────────────────────────────

export async function getEducation(): Promise<Education[]> {
  const result = await apiFetch<Education[]>('/api/education');
  return result ?? [];
}

// ── Achievements ──────────────────────────────────────────────

export async function getAchievements(): Promise<Achievement[]> {
  const result = await apiFetch<Achievement[]>('/api/achievements');
  return result ?? [];
}

// ── Site Settings ─────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return apiFetch<SiteSettings>('/api/settings');
}

// ── Nav ───────────────────────────────────────────────────────

/**
 * GET /api/pages/nav (PUBLIC) — returns { slug, title, navLabel, navOrder }[]
 * for pages where showInNav=true and published=true, ordered by navOrder.
 * Returns [] if the API is unreachable so the caller can fall back to a
 * static set.
 */
export async function getNav(): Promise<NavPage[]> {
  const result = await apiFetch<NavPage[]>('/api/pages/nav');
  return result ?? [];
}

// ── Config options (public, no auth) ──────────────────────────

/**
 * GET /api/config/:key — returns the items array for a config key.
 * Public endpoint (no auth). Returns [] on error or if API is unreachable.
 * Intended for use in client components that need to populate dropdowns.
 */
export async function getConfigOptions(key: string): Promise<ConfigOption[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/config/${key}`, {
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
 * mutation, not an ISR-cached read. Returns true on success,
 * false on any network or HTTP error.
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
    const res = await fetch(`${BASE_URL}/api/contact`, {
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
