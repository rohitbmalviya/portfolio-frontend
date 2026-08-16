// ============================================================
//  lib/types.ts — TypeScript mirror of the backend Prisma schema
//  Source of truth: portfolio-backend/prisma/schema.prisma + step4 §3.2
// ============================================================

// ── Enums ─────────────────────────────────────────────────────

export type SectionType =
  | 'HERO'
  | 'ABOUT'
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'FEATURED_PROJECTS'
  | 'PROJECTS_GRID'
  | 'BLOG_TEASER'
  | 'ACHIEVEMENTS'
  | 'EDUCATION'
  | 'CONTACT'
  | 'METRICS'
  | 'RICH_TEXT'
  | 'CTA'
  | 'GALLERY'
  | 'CONTENT_BLOCK';

/** DB-driven skill group — arbitrary string defined in the skill_groups Config key. */
export type SkillGroup = string;

export type SkillLevel = 'EXPERT' | 'PROFICIENT' | 'FAMILIAR';

export type DefaultTheme = 'DARK' | 'LIGHT';

// ── Shared sub-shapes ─────────────────────────────────────────

export interface MediaItem {
  url: string;
  alt: string;
}

/** A normalized media record returned by the backend Media table. */
export interface Media {
  id: string;
  cloudinaryUrl: string;
  publicId?: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  type?: string | null;
  category?: string;
  createdAt?: string;
}

// ── Page + Section ────────────────────────────────────────────

export interface Page {
  id: string;
  slug: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  ogImageMediaId?: string | null;
  navLabel?: string | null;
  navOrder: number;
  showInNav: boolean;
  published: boolean;
  isSystem: boolean;
  sections: Section[];
  /** Returned by GET /api/pages?admin=true instead of full sections array */
  _count?: { sections: number };
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  pageId: string;
  type: SectionType;
  order: number;
  enabled: boolean;
  data: SectionData;
  createdAt: string;
  updatedAt: string;
}

// ── Per-section data shapes (step4 §3.2) ─────────────────────

export interface HeroButton {
  label: string;
  href: string;
  style: 'primary' | 'ghost';
}

export interface HeroMetric {
  value: string;
  label: string;
}

export interface HeroData {
  eyebrow: string;
  name: string;
  gradientLine: string;
  subhead: string;
  buttons: HeroButton[];
  metrics: HeroMetric[];
}

export interface AboutData {
  heading: string;
  paragraphs: string[];
}

export interface SkillInline {
  label: string;
  items: string[];
}

export interface SkillsData {
  heading: string;
  source?: 'skills-table';
  mode?: 'all' | 'selected';
  /** When mode === 'selected': selected individual skill IDs to include. */
  ids?: string[];
  /** @deprecated Legacy — when mode === 'selected': SkillGroup key names to include.
   *  Kept for backward-compat; prefer ids. */
  groups?: string[];
  cta?: { label: string; href: string };
}

export interface ExperienceData {
  heading: string;
  source?: 'experience-table';
  mode?: 'all' | 'selected';
  ids?: string[];
  cta?: { label: string; href: string };
}

export interface FeaturedProjectsData {
  heading: string;
  /** Legacy field — kept for backward compat with existing seeded sections */
  projectIds?: string[];
  /** New: selected project IDs when mode === 'selected' */
  ids?: string[];
  auto?: 'featured';
  limit?: number;
  mode?: 'all' | 'selected';
  cta?: { label: string; href: string };
}

export interface ProjectsGridData {
  heading: string;
  filter?: 'all' | 'featured' | string;
  limit?: number;
  cta?: { label: string; href: string };
}

export interface BlogTeaserData {
  heading: string;
  limit?: number;
  mode?: 'latest' | 'selected';
  ids?: string[];
  cta?: { label: string; href: string };
}

export interface AchievementsData {
  heading: string;
  source?: 'achievements-table';
  mode?: 'all' | 'selected';
  ids?: string[];
  cta?: { label: string; href: string };
}

export interface EducationItem {
  degree: string;
  school: string;
  period: string;
  detail?: string;
}

export interface EducationData {
  heading: string;
  mode?: 'all' | 'selected';
  ids?: string[];
  /** Legacy inline items — kept optional for backward compat with old sections */
  items?: EducationItem[];
  cta?: { label: string; href: string };
}

export interface ContactLink {
  type: string;
  value: string;
}

export interface ContactData {
  heading: string;
  blurb: string;
  showForm: boolean;
  /** Legacy field — kept for backward-compat with existing seeded sections */
  email?: string;
  /** Legacy field — kept for backward-compat with existing seeded sections */
  socials?: Record<string, string>;
  /** New dynamic links list (replaces fixed email + socials fields) */
  links?: ContactLink[];
  resumeUrl?: string;
}

export interface MetricsData {
  items: Array<{ value: string; label: string }>;
}

export interface RichTextData {
  heading?: string;
  body: string;
}

export interface CtaData {
  heading: string;
  text: string;
  button: { label: string; href: string };
}

export interface GalleryData {
  heading?: string;
  images: { mediaId?: string; url: string; alt?: string }[];
}

export interface ContentBlockData {
  eyebrow?: string;
  heading?: string;
  paragraphs?: string[];
  align?: 'left' | 'center';
  source?: 'experience' | 'education' | 'skills' | 'projects' | 'achievements' | 'blog' | 'none';
  mode?: 'all' | 'selected' | 'latest';
  ids?: string[];
  limit?: number;
  cta?: { label: string; href: string };
}

// Discriminated union for exhaustive section rendering
export type SectionData =
  | HeroData
  | AboutData
  | SkillsData
  | ExperienceData
  | FeaturedProjectsData
  | ProjectsGridData
  | BlogTeaserData
  | AchievementsData
  | EducationData
  | ContactData
  | MetricsData
  | RichTextData
  | CtaData
  | GalleryData
  | ContentBlockData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>;

// ── Project ───────────────────────────────────────────────────

export interface Project {
  id: string;
  slug: string;
  title: string;
  oneLiner: string;
  role: string;
  tags: string[];
  stack: string[];
  metric: string;
  liveUrl?: string | null;
  /**
   * Auto-generated screenshot of `liveUrl`, captured server-side and cached in
   * Cloudinary. Null when the project has no live URL or the capture failed.
   * Takes precedence over `screenshots[0]` for the card thumbnail.
   */
  previewImage?: string | null;
  /** Read shape: normalized media records (id + url + optional alt). */
  screenshots: { mediaId: string; url: string; alt?: string }[];
  overview: string;
  contribution: string;
  body: string;
  featured: boolean;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── BlogPost ──────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Convenience alias: images[0]?.url — returned by the API for backward compat. */
  coverImage?: string | null;
  /** All attached images in display order (first = cover). */
  images: { mediaId: string; url: string; alt?: string }[];
  tags: string[];
  body: string;
  readingTime?: number | null;
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Skill ─────────────────────────────────────────────────────

export interface Skill {
  id: string;
  group: SkillGroup;
  name: string;
  level: SkillLevel;
  order: number;
}

/** Returned by GET /api/skills/grouped — one entry per non-empty group, in canonical order. */
export interface SkillGroupSection {
  group: SkillGroup;
  label: string;
  skills: Skill[];
}

// ── Experience ────────────────────────────────────────────────

export interface Experience {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string | null;
  bullets: string[];
  order: number;
  /** Display URL for the company logo (derived from the Media record). */
  logo?: string | null;
  /** Media record ID used for writes. */
  logoMediaId?: string | null;
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  startDate: string;
  endDate: string | null;
  detail?: string;
  order: number;
  /** Display URL for the institution logo (derived from the Media record). */
  logo?: string | null;
  /** Media record ID used for writes. */
  logoMediaId?: string | null;
}

// ── Achievement ───────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string | null;
  /** Display URL for the award image (derived from the Media record). */
  image?: string | null;
  /** Media record ID used for writes. */
  imageMediaId?: string | null;
  order: number;
}

// ── SiteSettings ──────────────────────────────────────────────

export interface SocialLink {
  type: string;
  value: string;
}

export interface SiteSettings {
  id: string;
  name: string;
  tagline: string;
  email: string;
  location: string;
  socials: SocialLink[];
  /** Display URL for the résumé PDF (derived from the Media record). */
  resumeUrl?: string | null;
  /** Media record ID for the résumé — used for writes. */
  resumeMediaId?: string | null;
  defaultTheme: DefaultTheme;
  brandAccent?: string | null;
  footerText?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  /** Display URL for the default OG image (derived from the Media record). */
  ogImage?: string | null;
  /** Media record ID for the default OG image — used for writes. */
  ogImageMediaId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Nav page (public navbar) ──────────────────────────────────

/** Shape returned by GET /api/pages/nav */
export interface NavPage {
  slug: string;
  title: string;
  navLabel?: string | null;
  navOrder: number;
}

// ── Configuration ─────────────────────────────────────────────

export interface ConfigOption {
  value: string;
  label: string;
}

export interface Configuration {
  id: string;
  key: string;
  label: string;
  items: ConfigOption[];
  createdAt: string;
  updatedAt: string;
}

// ── API response wrappers ─────────────────────────────────────

export interface ApiList<T> {
  data: T[];
  total?: number;
}

// ── Contact ───────────────────────────────────────────────────

export type ContactMessageDirection = 'inbound' | 'outbound';
export type ContactMessageSource = 'web' | 'app' | 'gmail' | 'notification';

export interface ContactMessage {
  id: string;
  direction: ContactMessageDirection;
  source: ContactMessageSource;
  body: string;
  createdAt: string;
}

export interface ContactThread {
  id: string;
  name: string;
  email: string;
  subject?: string;
  unread: boolean;
  lastMessageAt: string;
  createdAt: string;
  messageCount?: number;
  lastSnippet?: string;
  messages?: ContactMessage[];
}
