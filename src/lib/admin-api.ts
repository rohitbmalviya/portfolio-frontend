// ============================================================
//  lib/admin-api.ts — Authenticated admin API client
//  All calls send credentials:'include' so the httpOnly
//  access_token cookie is forwarded automatically.
//  On 401, redirects to /admin/login (client-side).
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

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

// ── Auth token storage ────────────────────────────────────────
// The backend sets an httpOnly cookie AND returns the access token in the
// login body. In production the frontend (Vercel) and API (Render) are on
// different sites, and many browsers block third-party cookies outright
// (Safari, Chrome Incognito/tracking-protection) — so the cookie alone is
// not reliable. We therefore also store the token and send it as an
// Authorization: Bearer header, which the backend's JwtStrategy accepts.

const TOKEN_KEY = 'admin_access_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode quota etc.) — cookie path still works
  }
}

function authHeader(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Low-level fetch ───────────────────────────────────────────

// All backend responses are wrapped: { data: T }
interface ApiEnvelope<T> {
  data: T;
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    // Clear any stale token, then redirect to login
    storeToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { message?: string };
      message = body?.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as T;

  // Unwrap { data: T } envelope returned by every backend controller
  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}

// Multipart upload (no Content-Type — browser sets boundary)
async function adminUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeader() },
    body: formData,
  });

  if (res.status === 401) {
    storeToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { message?: string };
      message = body?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  // Unwrap { data: T } envelope
  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}

// ── Auth ──────────────────────────────────────────────────────

export const adminAuth = {
  login: async (payload: LoginPayload) => {
    const res = await adminFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // Keep the token for Bearer auth — the httpOnly cookie alone is
    // unreliable cross-site (third-party cookie blocking).
    storeToken(res.accessToken);
    return res;
  },

  me: () => adminFetch<MeResponse>('/api/auth/me'),

  logout: async () => {
    try {
      await adminFetch<void>('/api/auth/logout', { method: 'POST' });
    } finally {
      storeToken(null);
    }
  },
};

// ── Pages ─────────────────────────────────────────────────────

export const adminPages = {
  // ?admin=true returns pages with their sections array populated,
  // which lets the list UI show section counts.
  list: () => adminFetch<Page[]>('/api/pages?admin=true'),

  // Fetch a single page with all its sections by primary key (ID).
  // Uses the dedicated /id/:id route to avoid conflating IDs with slugs.
  get: (id: string) =>
    adminFetch<Page>(`/api/pages/id/${id}`),

  getBySlug: (slug: string) =>
    adminFetch<Page>(`/api/pages/${slug}?admin=true`),

  create: (payload: CreatePagePayload) =>
    adminFetch<Page>('/api/pages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdatePagePayload) =>
    adminFetch<Page>(`/api/pages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/pages/${id}`, { method: 'DELETE' }),
};

// ── Sections ──────────────────────────────────────────────────

export const adminSections = {
  create: (payload: CreateSectionPayload) =>
    adminFetch<Section>('/api/sections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateSectionPayload) =>
    adminFetch<Section>(`/api/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/sections/${id}`, { method: 'DELETE' }),

  reorder: (sections: ReorderItem[]) =>
    adminFetch<void>('/api/sections/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ sections }),
    }),

  toggle: (id: string) =>
    adminFetch<Section>(`/api/sections/${id}/toggle`, { method: 'PATCH' }),
};

// ── Projects ──────────────────────────────────────────────────

export const adminProjects = {
  list: () => adminFetch<Project[]>('/api/projects?admin=true'),

  get: (id: string) => adminFetch<Project>(`/api/projects/id/${id}`),

  create: (payload: CreateProjectPayload) =>
    adminFetch<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateProjectPayload) =>
    adminFetch<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/api/projects/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ projects: items }),
    }),

  toggleFeatured: (id: string) =>
    adminFetch<Project>(`/api/projects/${id}/feature`, { method: 'PATCH' }),

  togglePublished: (id: string) =>
    adminFetch<Project>(`/api/projects/${id}/publish`, { method: 'PATCH' }),
};

// ── Blog ──────────────────────────────────────────────────────

export const adminBlog = {
  list: () => adminFetch<BlogPost[]>('/api/blog?admin=true'),

  get: (id: string) => adminFetch<BlogPost>(`/api/blog/id/${id}`),

  create: (payload: CreateBlogPayload) =>
    adminFetch<BlogPost>('/api/blog', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateBlogPayload) =>
    adminFetch<BlogPost>(`/api/blog/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/blog/${id}`, { method: 'DELETE' }),

  togglePublished: (id: string) =>
    adminFetch<BlogPost>(`/api/blog/${id}/publish`, { method: 'PATCH' }),
};

// ── Skills ────────────────────────────────────────────────────

export const adminSkills = {
  /** GET /api/skills/grouped — skills pre-grouped in canonical order, empty groups omitted. */
  listGrouped: () => adminFetch<SkillGroupSection[]>('/api/skills/grouped'),

  create: (payload: CreateSkillPayload) =>
    adminFetch<Skill>('/api/skills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateSkillPayload) =>
    adminFetch<Skill>(`/api/skills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/skills/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/api/skills/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ skills: items }),
    }),
};

// ── Experience ────────────────────────────────────────────────

export const adminExperience = {
  list: () => adminFetch<Experience[]>('/api/experience'),

  get: (id: string) => adminFetch<Experience>(`/api/experience/${id}`),

  create: (payload: CreateExperiencePayload) =>
    adminFetch<Experience>('/api/experience', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateExperiencePayload) =>
    adminFetch<Experience>(`/api/experience/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/experience/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/api/experience/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ experience: items }),
    }),
};

// ── Education ─────────────────────────────────────────────────

export const adminEducation = {
  list: () => adminFetch<Education[]>('/api/education'),

  get: (id: string) => adminFetch<Education>(`/api/education/${id}`),

  create: (payload: CreateEducationPayload) =>
    adminFetch<Education>('/api/education', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateEducationPayload) =>
    adminFetch<Education>(`/api/education/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/education/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/api/education/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ education: items }),
    }),
};

// ── Achievements ──────────────────────────────────────────────

export const adminAchievements = {
  list: () => adminFetch<Achievement[]>('/api/achievements'),

  get: (id: string) => adminFetch<Achievement>(`/api/achievements/${id}`),

  create: (payload: CreateAchievementPayload) =>
    adminFetch<Achievement>('/api/achievements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateAchievementPayload) =>
    adminFetch<Achievement>(`/api/achievements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/achievements/${id}`, { method: 'DELETE' }),

  reorder: (items: ReorderItem[]) =>
    adminFetch<void>('/api/achievements/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ achievements: items }),
    }),
};

// ── Settings ──────────────────────────────────────────────────

export const adminSettings = {
  get: () => adminFetch<SiteSettings>('/api/settings'),

  update: (payload: UpdateSettingsPayload) =>
    adminFetch<SiteSettings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

// ── Media ─────────────────────────────────────────────────────

export const adminMedia = {
  list: () => adminFetch<MediaRecord[]>('/api/media'),

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
    return adminUpload<MediaRecord>('/api/media', fd);
  },

  update: (id: string, payload: { category?: string; alt?: string }) =>
    adminFetch<MediaRecord>(`/api/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    adminFetch<void>(`/api/media/${id}`, { method: 'DELETE' }),
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
  return adminUpload<MediaRecord>('/api/media', fd);
}

/** Hard-delete a media record from Cloudinary + DB. */
export function deleteMedia(id: string): Promise<void> {
  return adminFetch<void>(`/api/media/${id}`, { method: 'DELETE' });
}

/** PATCH a media record's order, alt, or usage. */
export function patchMedia(
  id: string,
  payload: { order?: number; alt?: string; usage?: string },
): Promise<MediaRecord> {
  return adminFetch<MediaRecord>(`/api/media/${id}`, {
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
  get: () => adminFetch<DashboardCounts>('/api/stats'),
};

// ── Configuration ─────────────────────────────────────────────

export const adminConfig = {
  /** GET /api/config — list all config sets */
  list: () => adminFetch<Configuration[]>('/api/config'),

  /** GET /api/config/:key — fetch a single config set by key */
  get: (key: string) => adminFetch<Configuration>(`/api/config/${key}`),

  /** PATCH /api/config/:key — upsert items (and optionally label) for a key */
  update: (
    key: string,
    payload: { label?: string; items: ConfigOption[] },
  ) =>
    adminFetch<Configuration>(`/api/config/${key}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

// ── Contact (admin) ───────────────────────────────────────────

/** ContactThread with messages guaranteed to be present (returned by getThread). */
export type ContactThreadDetail = ContactThread & { messages: ContactMessage[] };

export const adminContact = {
  /** GET /api/contact/threads — list all threads, newest-last-message first. */
  listThreads: () => adminFetch<ContactThread[]>('/api/contact/threads'),

  /** GET /api/contact/unread-count — returns { count } of unread threads. */
  unreadCount: () => adminFetch<{ count: number }>('/api/contact/unread-count'),

  /** GET /api/contact/threads/:id — full thread with all messages. */
  getThread: (id: string) =>
    adminFetch<ContactThreadDetail>(`/api/contact/threads/${id}`),

  /** PATCH /api/contact/threads/:id/read — marks thread as read. */
  markRead: (id: string) =>
    adminFetch<void>(`/api/contact/threads/${id}/read`, { method: 'PATCH' }),

  /** POST /api/contact/threads/:id/reply — sends a reply. */
  reply: (id: string, body: string) =>
    adminFetch<ContactMessage>(`/api/contact/threads/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  /** DELETE /api/contact/threads/:id — permanently removes a thread. */
  remove: (id: string) =>
    adminFetch<void>(`/api/contact/threads/${id}`, { method: 'DELETE' }),

  /** POST /api/contact/sync — triggers a Gmail/IMAP sync on the backend. */
  sync: () =>
    adminFetch<void>('/api/contact/sync', { method: 'POST' }),

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
    adminFetch<ContactThreadDetail>('/api/contact/compose', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * PATCH /api/contact/read-all — mark every unread thread as read.
   * Returns the number of threads updated.
   */
  readAll: () =>
    adminFetch<{ updated: number }>('/api/contact/read-all', {
      method: 'PATCH',
    }),
};

// ── Helpers re-exported for convenience ───────────────────────

export type { SectionType, ConfigOption, Configuration, ContactMessage, ContactThread };
