// ============================================================
//  lib/admin-api.ts — Authenticated admin API client
//
//  All admin calls go through the same-origin `/backend-api/*`
//  proxy (see next.config.ts `rewrites()`), which forwards to the
//  real backend `/api/*`. Because the request is proxied server-side
//  by Next.js, the backend's Set-Cookie responses (access_token,
//  refresh_token — both httpOnly) land first-party on the frontend's
//  own domain, so `credentials: 'include'` is enough — no client-side
//  token storage is needed even though the deployed frontend (Vercel)
//  and backend (Render) are cross-origin.
//
//  On a 401, we attempt a single silent refresh (POST .../auth/refresh,
//  cookie-based) and retry the original request once. If the refresh
//  fails, or the retry still 401s, we redirect to /admin/login.
//  Concurrent 401s share one in-flight refresh promise so we never
//  fire multiple refresh requests at once.
//
//  Response envelope: every backend endpoint returns { data: T }.
//  adminFetch / adminUpload unwrap the envelope and return T.
// ============================================================

import type {
  Page,
  Section,
  SectionData,
  SectionType,
  Project,
  BlogPost,
  Skill,
  SkillGroup,
  SkillLevel,
  SkillGroupSection,
  Experience,
  Education,
  Achievement,
  SiteSettings,
  ConfigOption,
  Configuration,
  ContactMessage,
  ContactThread,
} from './types';

// Relative + same-origin so the browser sends first-party cookies.
// All admin calls happen client-side, so a relative path is safe here
// (unlike lib/api.ts, which runs server-side and needs an absolute URL).
const BASE = '/backend-api';

// ── Media (from backend schema) ───────────────────────────────

export interface MediaRecord {
  id: string;
  cloudinaryUrl: string;
  publicId: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  type?: string | null;
  category: string;
  createdAt: string;
}

// ── Auth DTOs ─────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
}

// ── Generic write DTOs ────────────────────────────────────────

/**
 * Write payload for Pages.
 * `ogImage` and `ogImageMediaId` are excluded — media linking happens
 * automatically via the upload's `ownerId` / `ownerType` fields.
 */
export type CreatePagePayload = Pick<
  Page,
  'slug' | 'title'
> & Partial<Omit<Page, 'id' | 'slug' | 'title' | 'sections' | '_count' | 'createdAt' | 'updatedAt' | 'ogImage' | 'ogImageMediaId'>>;

export type UpdatePagePayload = Partial<CreatePagePayload>;

export interface CreateSectionPayload {
  pageId: string;
  type: SectionType;
  order?: number;
  data?: SectionData;
}

export type UpdateSectionPayload = Partial<{
  type: SectionType;
  order: number;
  enabled: boolean;
  data: SectionData;
}>;

export interface ReorderItem {
  id: string;
  order: number;
}

/**
 * Write payload for Projects.
 * Screenshots are no longer referenced by media ID — linking happens automatically
 * via the upload's `ownerId` / `ownerType` fields. The server returns `screenshots`
 * in the read shape.
 */
export type CreateProjectPayload = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'screenshots'>;
export type UpdateProjectPayload = Partial<CreateProjectPayload>;

/**
 * Write payload for BlogPosts.
 * Images are no longer referenced by media ID — linking happens automatically
 * via the upload's `ownerId` / `ownerType` fields. The first uploaded image
 * becomes the cover. `coverImage` (read-only) is excluded from the write shape.
 */
export type CreateBlogPayload = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'images' | 'coverImage'>;
export type UpdateBlogPayload = Partial<CreateBlogPayload>;

export interface CreateSkillPayload {
  group: SkillGroup;
  name: string;
  level: SkillLevel;
  order?: number;
}
export type UpdateSkillPayload = Partial<CreateSkillPayload>;

/**
 * Write payload for Experience.
 * `logo` (read-only URL) and `logoMediaId` are excluded — media linking happens
 * automatically via the upload's `ownerId` / `ownerType` fields.
 */
export type CreateExperiencePayload = Omit<Experience, 'id' | 'logo' | 'logoMediaId'>;
export type UpdateExperiencePayload = Partial<CreateExperiencePayload>;

/**
 * Write payload for Education.
 * `logo` (read-only URL) and `logoMediaId` are excluded — media linking happens
 * automatically via the upload's `ownerId` / `ownerType` fields.
 */
export type CreateEducationPayload = Omit<Education, 'id' | 'logo' | 'logoMediaId'>;
export type UpdateEducationPayload = Partial<CreateEducationPayload>;

/**
 * Write payload for Achievements.
 * `image` (read-only URL) and `imageMediaId` are excluded — media linking happens
 * automatically via the upload's `ownerId` / `ownerType` fields.
 */
export interface CreateAchievementPayload {
  title: string;
  description: string;
  date?: string | null;
  order?: number;
}
export type UpdateAchievementPayload = Partial<CreateAchievementPayload>;

/**
 * Write payload for SiteSettings.
 * `resumeUrl`, `ogImage` (read-only URLs), `resumeMediaId`, and `ogImageMediaId`
 * are excluded — media linking happens automatically via the upload's owner fields.
 */
export type UpdateSettingsPayload = Partial<
  Omit<SiteSettings, 'id' | 'createdAt' | 'updatedAt' | 'resumeUrl' | 'ogImage' | 'resumeMediaId' | 'ogImageMediaId'>
>;

// ── Low-level fetch ───────────────────────────────────────────

// All backend responses are wrapped: { data: T }
interface ApiEnvelope<T> {
  data: T;
}

// ── Public-cache invalidation ─────────────────────────────────
//
// Public pages are ISR-cached with a long window (lib/api.ts), so an admin
// edit would otherwise not appear until that window expired. After every
// successful mutation we POST /api/revalidate, which drops the affected tags
// and makes the edit live on the next request.
//
// This is wired into adminFetch/adminUpload rather than into each admin page
// on purpose: there is no way to add a new mutation and forget to invalidate.

/** Path prefix → tags to drop. Anything unlisted invalidates everything. */
const REVALIDATE_TAGS: Array<[prefix: string, tags: string[]]> = [
  // Collections also carry `pages`, because a page's sections render these
  // records inline — editing a project changes any page showing a project grid.
  ['/projects', ['projects', 'pages']],
  ['/blog', ['blog', 'pages']],
  ['/skills', ['skills', 'pages']],
  ['/experience', ['experience', 'pages']],
  ['/education', ['education', 'pages']],
  ['/achievements', ['achievements', 'pages']],
  ['/settings', ['settings', 'pages']],
  ['/sections', ['pages']],
  ['/pages', ['pages']],
];

/** Mutations that change nothing a visitor can see — skip the round-trip. */
const NO_REVALIDATE_PATHS = ['/auth', '/contact', '/stats'];

function tagsForPath(path: string): string[] | undefined {
  const match = REVALIDATE_TAGS.find(([prefix]) => path.startsWith(prefix));
  // undefined → the endpoint sends every tag. Media and config land here:
  // an uploaded image or a changed option list can surface almost anywhere,
  // and over-invalidating costs one re-render while under-invalidating
  // silently serves stale content.
  return match?.[1];
}

function revalidatePublicCache(path: string, method: string): void {
  if (method === 'GET') return;
  if (NO_REVALIDATE_PATHS.some((p) => path.startsWith(p))) return;

  const tags = tagsForPath(path);

  // Fire-and-forget: the admin's save should not wait on, or fail because of,
  // cache housekeeping. If this call is lost the ISR window still catches up.
  void fetch('/api/revalidate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tags ? { tags } : {}),
  }).catch(() => {
    /* non-fatal — the time-based window is the backstop */
  });
}

/** Paths that must never trigger (or be retried by) the refresh flow. */
const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout'];

function shouldAttemptRefresh(path: string): boolean {
  return !NO_REFRESH_PATHS.some((p) => path.startsWith(p));
}

// Shared in-flight refresh promise so concurrent 401s only trigger one
// POST /backend-api/auth/refresh, not a stampede of duplicate requests.
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { message?: string };
    message = body?.message ?? message;
  } catch {
    // ignore parse error
  }
  return message;
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const doFetch = () =>
    fetch(`${BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });

  let res = await doFetch();

  if (res.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (res.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  // Succeeded — if this changed content, drop the matching public cache tags.
  revalidatePublicCache(path, (options.method ?? 'GET').toUpperCase());

  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as T;

  // Unwrap { data: T } envelope returned by every backend controller
  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}

// Multipart upload (no Content-Type — browser sets boundary)
async function adminUpload<T>(path: string, formData: FormData): Promise<T> {
  const doUpload = () =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

  let res = await doUpload();

  if (res.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doUpload();
    }
  }

  if (res.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  // A new upload can appear on any public page — invalidate before returning.
  revalidatePublicCache(path, 'POST');

  // Unwrap { data: T } envelope
  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}

// ── Auth ──────────────────────────────────────────────────────

export const adminAuth = {
  // The backend still returns tokens in the login response body, but we
  // ignore them entirely — the httpOnly Set-Cookie response (proxied
  // same-origin via /backend-api) is the only thing that matters now.
  login: (payload: LoginPayload) =>
    adminFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => adminFetch<MeResponse>('/auth/me'),

  logout: () => adminFetch<void>('/auth/logout', { method: 'POST' }),
};

// ── Pages ─────────────────────────────────────────────────────

export const adminPages = {
  // ?admin=true returns pages with their sections array populated,
  // which lets the list UI show section counts.
  list: () => adminFetch<Page[]>('/pages?admin=true'),

  // Fetch a single page with all its sections by primary key (ID).
  // Uses the dedicated /id/:id route to avoid conflating IDs with slugs.
  get: (id: string) =>
    adminFetch<Page>(`/pages/id/${id}`),

  getBySlug: (slug: string) =>
    adminFetch<Page>(`/pages/${slug}?admin=true`),

  create: (payload: CreatePagePayload) =>
    adminFetch<Page>('/pages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdatePagePayload) =>
    adminFetch<Page>(`/pages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/pages/${id}`, { method: 'DELETE' }),
};

// ── Sections ──────────────────────────────────────────────────

export const adminSections = {
  create: (payload: CreateSectionPayload) =>
    adminFetch<Section>('/sections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateSectionPayload) =>
    adminFetch<Section>(`/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/sections/${id}`, { method: 'DELETE' }),

  reorder: (sections: ReorderItem[]) =>
    adminFetch<void>('/sections/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ sections }),
    }),

  toggle: (id: string) =>
    adminFetch<Section>(`/sections/${id}/toggle`, { method: 'PATCH' }),
};

// ── Projects ──────────────────────────────────────────────────

export const adminProjects = {
  list: () => adminFetch<Project[]>('/projects?admin=true'),

  get: (id: string) => adminFetch<Project>(`/projects/id/${id}`),

  create: (payload: CreateProjectPayload) =>
    adminFetch<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateProjectPayload) =>
    adminFetch<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/projects/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/projects/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ projects: items }),
    }),

  toggleFeatured: (id: string) =>
    adminFetch<Project>(`/projects/${id}/feature`, { method: 'PATCH' }),

  togglePublished: (id: string) =>
    adminFetch<Project>(`/projects/${id}/publish`, { method: 'PATCH' }),

  /**
   * POST /api/projects/:id/preview — re-capture the live-site screenshot used
   * as the card thumbnail. Runs synchronously (a headless render takes a few
   * seconds) and resolves with the updated project. Rejects with a readable
   * message if the project has no liveUrl or the capture failed.
   */
  regeneratePreview: (id: string) =>
    adminFetch<Project>(`/projects/${id}/preview`, { method: 'POST' }),
};

// ── Blog ──────────────────────────────────────────────────────

export const adminBlog = {
  list: () => adminFetch<BlogPost[]>('/blog?admin=true'),

  get: (id: string) => adminFetch<BlogPost>(`/blog/id/${id}`),

  create: (payload: CreateBlogPayload) =>
    adminFetch<BlogPost>('/blog', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateBlogPayload) =>
    adminFetch<BlogPost>(`/blog/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/blog/${id}`, { method: 'DELETE' }),

  togglePublished: (id: string) =>
    adminFetch<BlogPost>(`/blog/${id}/publish`, { method: 'PATCH' }),
};

// ── Skills ────────────────────────────────────────────────────

export const adminSkills = {
  /** GET /api/skills/grouped — skills pre-grouped in canonical order, empty groups omitted. */
  listGrouped: () => adminFetch<SkillGroupSection[]>('/skills/grouped'),

  create: (payload: CreateSkillPayload) =>
    adminFetch<Skill>('/skills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateSkillPayload) =>
    adminFetch<Skill>(`/skills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/skills/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/skills/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ skills: items }),
    }),
};

// ── Experience ────────────────────────────────────────────────

export const adminExperience = {
  list: () => adminFetch<Experience[]>('/experience'),

  get: (id: string) => adminFetch<Experience>(`/experience/${id}`),

  create: (payload: CreateExperiencePayload) =>
    adminFetch<Experience>('/experience', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateExperiencePayload) =>
    adminFetch<Experience>(`/experience/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/experience/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/experience/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ experience: items }),
    }),
};

// ── Education ─────────────────────────────────────────────────

export const adminEducation = {
  list: () => adminFetch<Education[]>('/education'),

  get: (id: string) => adminFetch<Education>(`/education/${id}`),

  create: (payload: CreateEducationPayload) =>
    adminFetch<Education>('/education', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateEducationPayload) =>
    adminFetch<Education>(`/education/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/education/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/education/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ education: items }),
    }),
};

// ── Achievements ──────────────────────────────────────────────

export const adminAchievements = {
  list: () => adminFetch<Achievement[]>('/achievements'),

  get: (id: string) => adminFetch<Achievement>(`/achievements/${id}`),

  create: (payload: CreateAchievementPayload) =>
    adminFetch<Achievement>('/achievements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateAchievementPayload) =>
    adminFetch<Achievement>(`/achievements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/achievements/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/achievements/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ achievements: items }),
    }),
};

// ── Settings ──────────────────────────────────────────────────

export const adminSettings = {
  get: () => adminFetch<SiteSettings>('/settings'),

  update: (payload: UpdateSettingsPayload) =>
    adminFetch<SiteSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

// ── Media ─────────────────────────────────────────────────────

export const adminMedia = {
  list: () => adminFetch<MediaRecord[]>('/media'),

  /** Legacy upload used by the media library (non-deferred). */
  upload: (
    file: File,
    opts: {
      alt?: string;
      category?: string;
      entitySlug?: string;
      ownerId?: string;
      ownerType?: string;
      usage?: string;
      order?: number;
    } = {},
  ) => {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.alt) fd.append('alt', opts.alt);
    if (opts.category) fd.append('category', opts.category);
    if (opts.entitySlug) fd.append('entitySlug', opts.entitySlug);
    if (opts.ownerId) fd.append('ownerId', opts.ownerId);
    if (opts.ownerType) fd.append('ownerType', opts.ownerType);
    if (opts.usage) fd.append('usage', opts.usage);
    if (opts.order !== undefined) fd.append('order', String(opts.order));
    return adminUpload<MediaRecord>('/media', fd);
  },

  update: (id: string, payload: { category?: string; alt?: string }) =>
    adminFetch<MediaRecord>(`/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/media/${id}`, { method: 'DELETE' }),
};

// ── Standalone media helpers (used by media-save.ts) ─────────

export type MediaOwnerType =
  | 'project'
  | 'blog'
  | 'experience'
  | 'education'
  | 'achievement'
  | 'page'
  | 'section'
  | 'settings';

/**
 * Upload a file to POST /api/media and auto-link to the owner entity.
 * Returns the created MediaRecord.
 */
export function uploadMedia(
  file: File,
  opts: {
    category?: string;
    entitySlug?: string;
    ownerId?: string;
    ownerType?: MediaOwnerType | string;
    usage?: string;
    order?: number;
    alt?: string;
  },
): Promise<MediaRecord> {
  const fd = new FormData();
  fd.append('file', file);
  if (opts.alt) fd.append('alt', opts.alt);
  if (opts.category) fd.append('category', opts.category);
  if (opts.entitySlug) fd.append('entitySlug', opts.entitySlug);
  if (opts.ownerId) fd.append('ownerId', opts.ownerId);
  if (opts.ownerType) fd.append('ownerType', opts.ownerType);
  if (opts.usage) fd.append('usage', opts.usage);
  if (opts.order !== undefined) fd.append('order', String(opts.order));
  return adminUpload<MediaRecord>('/media', fd);
}

/** Hard-delete a media record from Cloudinary + DB. */
export function deleteMedia(id: string): Promise<void> {
  return adminFetch<void>(`/media/${id}`, { method: 'DELETE' });
}

/** PATCH a media record's order, alt, or usage. */
export function patchMedia(
  id: string,
  payload: { order?: number; alt?: string; usage?: string },
): Promise<MediaRecord> {
  return adminFetch<MediaRecord>(`/media/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ── Dashboard stats (single call for all content counts) ──────

export interface DashboardCounts {
  pages: number;
  projects: number;
  blogPosts: number;
  skills: number;
  experience: number;
  education: number;
  achievements: number;
  media: number;
}

export const adminStats = {
  get: () => adminFetch<DashboardCounts>('/stats'),
};

// ── Configuration ─────────────────────────────────────────────

export const adminConfig = {
  /** GET /api/config — list all config sets */
  list: () => adminFetch<Configuration[]>('/config'),

  /** GET /api/config/:key — fetch a single config set by key */
  get: (key: string) => adminFetch<Configuration>(`/config/${key}`),

  /** PATCH /api/config/:key — upsert items (and optionally label) for a key */
  update: (
    key: string,
    payload: { label?: string; items: ConfigOption[] },
  ) =>
    adminFetch<Configuration>(`/config/${key}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

// ── Mail (Gmail OAuth connection) ─────────────────────────────

export interface MailStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  scope: string | null;
  /** ENCRYPTION_KEY is set, so a refresh token can be stored securely. */
  encryptionReady: boolean;
  /** GOOGLE_CLIENT_ID/SECRET are set, so the OAuth flow can run at all. */
  oauthConfigured: boolean;
}

export const adminMail = {
  /** GET /api/mail/status — is a mailbox connected, and which one. */
  status: () => adminFetch<MailStatus>('/mail/status'),

  /**
   * GET /api/mail/connect — returns the Google consent URL.
   *
   * The server returns a URL rather than a 302 because fetch would follow a
   * redirect opaquely and never surface Google's consent page. The caller
   * navigates the browser there itself.
   */
  connectUrl: () => adminFetch<{ url: string }>('/mail/connect'),

  /** DELETE /api/mail/disconnect — revokes with Google, then forgets it. */
  disconnect: () => adminFetch<void>('/mail/disconnect', { method: 'DELETE' }),
};

// ── Contact (admin) ───────────────────────────────────────────

/** ContactThread with messages guaranteed to be present (returned by getThread). */
export type ContactThreadDetail = ContactThread & { messages: ContactMessage[] };

export const adminContact = {
  /** GET /api/contact/threads — list all threads, newest-last-message first. */
  listThreads: () => adminFetch<ContactThread[]>('/contact/threads'),

  /** GET /api/contact/unread-count — returns { count } of unread threads. */
  unreadCount: () => adminFetch<{ count: number }>('/contact/unread-count'),

  /** GET /api/contact/threads/:id — full thread with all messages. */
  getThread: (id: string) =>
    adminFetch<ContactThreadDetail>(`/contact/threads/${id}`),

  /** PATCH /api/contact/threads/:id/read — marks thread as read. */
  markRead: (id: string) =>
    adminFetch<void>(`/contact/threads/${id}/read`, { method: 'PATCH' }),

  /** POST /api/contact/threads/:id/reply — sends a reply. */
  reply: (id: string, body: string) =>
    adminFetch<ContactMessage>(`/contact/threads/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  /** DELETE /api/contact/threads/:id — permanently removes a thread. */
  remove: (id: string) =>
    adminFetch<void>(`/contact/threads/${id}`, { method: 'DELETE' }),

  /** POST /api/contact/sync — triggers a Gmail/IMAP sync on the backend. */
  sync: () =>
    adminFetch<void>('/contact/sync', { method: 'POST' }),

  /**
   * POST /api/contact/compose — create a new outbound thread.
   * Returns the newly-created thread with its messages array populated.
   */
  compose: (payload: {
    to: string;
    name?: string;
    subject?: string;
    body: string;
  }) =>
    adminFetch<ContactThreadDetail>('/contact/compose', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * PATCH /api/contact/read-all — mark every unread thread as read.
   * Returns the number of threads updated.
   */
  readAll: () =>
    adminFetch<{ updated: number }>('/contact/read-all', {
      method: 'PATCH',
    }),
};

// ── Helpers re-exported for convenience ───────────────────────

export type { SectionType, ConfigOption, Configuration, ContactMessage, ContactThread };
