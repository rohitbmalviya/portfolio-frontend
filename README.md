# portfolio-frontend

Public portfolio site and private admin CMS built with Next.js 15 App Router, TypeScript, and Tailwind CSS. All content — pages, sections, projects, blog posts, skills, experience, and more — is managed through the bundled `/admin` interface and served from the companion NestJS backend (`portfolio-backend`).

---

## Tech Stack

| Layer | Library / Tool | Version |
|---|---|---|
| Framework | Next.js App Router | ^15.3.2 |
| UI runtime | React | ^19.0.0 |
| Language | TypeScript | ^5.8.3 |
| Styling | Tailwind CSS | ^3.4.17 |
| Primitive components | Radix UI (Dialog, Dropdown, Slot, Tooltip) | latest |
| Icons | lucide-react, @icons-pack/react-simple-icons | ^0.511.0 / ^13.13.0 |
| Markdown rendering | react-markdown + rehype-highlight + rehype-slug + remark-gfm | ^9.0.3 |
| Syntax highlighting | highlight.js | ^11.11.1 |
| Utility classes | clsx + tailwind-merge | ^2.1.1 / ^3.3.0 |
| Date formatting | date-fns | ^4.4.0 |
| Date picker | react-day-picker | ^10.0.1 |
| Fonts | Space Grotesk, Inter, JetBrains Mono (via `next/font`) | — |
| Images | `next/image` (Cloudinary + Unsplash remote patterns) | built-in |
| Output | `standalone` (Docker-friendly) | — |

---

## Architecture

### Route Map

```
src/
├── middleware.ts                     # Gates /admin/* on access_token cookie presence
└── app/
    ├── layout.tsx                    # Root layout — fonts, theme, CMS-driven metadata
    ├── sitemap.ts                    # Dynamic XML sitemap (projects + blog from API)
    ├── not-found.tsx
    ├── (public)/
    │   ├── layout.tsx                # Public layout — Navbar + Footer
    │   ├── page.tsx                  # / — Home: fetches "home" page from CMS
    │   ├── [slug]/
    │   │   ├── page.tsx              # /:slug — Any admin-created CMS page
    │   │   └── [item]/
    │   │       └── page.tsx          # /:slug/:item — Unified collection detail route
    │   └── error.tsx
    └── admin/
        ├── layout.tsx                # Admin shell — sidebar + AdminAuthGuard
        ├── login/page.tsx
        ├── page.tsx                  # Dashboard
        ├── pages/[id]/page.tsx       # Pages & Sections editor
        ├── projects/[id]/page.tsx
        ├── blog/[id]/page.tsx
        ├── skills/page.tsx
        ├── experience/[id]/page.tsx
        ├── education/[id]/page.tsx
        ├── achievements/[id]/page.tsx
        ├── media/page.tsx            # Media library (view-only)
        ├── messages/page.tsx         # Contact inbox + unread bell
        ├── config/page.tsx
        └── settings/page.tsx
```

### Public Routing in Detail

**`/` (Home)**
Fetches `GET /api/pages/home` and renders its ordered, enabled sections through `SectionRenderer`. The CMS is the sole source of truth — there is no static inline fallback.

**`/:slug` (CMS pages)**
Handles any page created in the admin (e.g., `/contact`, `/about`, `/uses`). Rendered on demand and then ISR-cached; an admin save invalidates the `pages` tag, so an edit is live on the next request. Metadata (`metaTitle`, `metaDescription`, `ogImage`) is sourced from the CMS page record.

**`/:slug/:item` (Unified detail route)**
A single route handles detail pages for every collection. `[slug]` is the collection name; `[item]` is the item slug or id:

| URL pattern | Collection | Rendered by |
|---|---|---|
| `/projects/:slug` | Projects | `ProjectDetail` |
| `/blog/:slug` | Blog posts | `BlogDetail` |
| `/experience/:id` | Experience | `ExperienceDetail` |
| `/education/:id` | Education | `EducationDetail` |
| `/achievements/:id` | Achievements | `AchievementDetail` |

Every item is fetched from the API, rendered on demand and ISR-cached, with admin saves invalidating the relevant tag. Per-item Open Graph metadata is generated dynamically via `generateMetadata`.

### SectionRenderer

`src/components/sections/section-renderer.tsx` is an async Server Component that takes the `sections` array from a CMS page, filters to enabled items, sorts by `order`, and switches to the appropriate component. Numbered sections (ABOUT, SKILLS, EXPERIENCE, ...) receive a two-digit ordinal prefix (`01`, `02`, ...). Unnumbered sections (HERO, METRICS, RICH_TEXT, CTA, GALLERY, CONTENT_BLOCK) manage their own headers.

**All supported section types:**

| Type | Component | Description |
|---|---|---|
| `HERO` | `HeroSection` | Eyebrow, name, gradient headline, subhead, CTA buttons, inline metrics |
| `ABOUT` | `AboutSection` | Heading + paragraph array |
| `SKILLS` | `SkillsSection` | Grouped skills from the Skills table (all or selected IDs/groups) |
| `EXPERIENCE` | `ExperienceSection` | Timeline cards from the Experience table |
| `FEATURED_PROJECTS` | `FeaturedProjectsSection` | Manually curated or auto-featured projects |
| `PROJECTS_GRID` | `ProjectsGridSection` | Full projects grid with optional tag filter |
| `BLOG_TEASER` | `BlogTeaserSection` | Latest or selected blog post cards |
| `ACHIEVEMENTS` | `AchievementsSection` | Achievement cards from the Achievements table |
| `EDUCATION` | `EducationSection` | Education cards from the Education table |
| `CONTACT` | `ContactSection` | Heading, blurb, optional contact form, dynamic social links |
| `METRICS` | `MetricsSection` | Stat callouts (value + label pairs) |
| `RICH_TEXT` | `RichTextSection` | Free-form Markdown body with optional heading |
| `CTA` | `CtaSection` | Full-width call-to-action banner |
| `GALLERY` | `GallerySection` | Image grid from Cloudinary media |
| `CONTENT_BLOCK` | `ContentBlockSection` | Flexible block: eyebrow + heading + paragraphs + any collection as cards + optional CTA link |

`CONTENT_BLOCK` is the most flexible type. The admin sets a `source` (`projects`, `blog`, `experience`, `education`, `skills`, `achievements`, or `none`), a `mode` (`all`, `selected`, or `latest`), an optional `limit`, and an optional CTA. The component fetches the chosen collection server-side and renders the appropriate cards inline.

---

## Admin CMS

The `/admin` area is a full headless CMS bundled into the same Next.js app. It is client-rendered (all admin pages are `'use client'`) and protected by an `AdminAuthGuard` component that checks for an authenticated session on mount. Authentication is handled entirely by the NestJS backend via httpOnly cookies — the frontend never issues or stores its own session.

### Admin auth & the `/backend-api` proxy

In production the frontend (Vercel) and backend (Google Cloud Run) live on different origins, and browsers routinely block third-party cookies (Safari, Chrome tracking-protection, etc.). To keep auth cookie-based without falling back to client-side token storage, all admin API calls (`lib/admin-api.ts`) go through a same-origin rewrite instead of hitting the backend directly:

```
/backend-api/:path*  →  ${NEXT_PUBLIC_API_URL}/api/:path*   (next.config.ts → rewrites())
```

Because Next.js rewrites proxy the request server-side, the backend's `Set-Cookie` response (`access_token`, `refresh_token` — both httpOnly) lands first-party on the frontend's own domain, so `credentials: 'include'` alone is enough for every subsequent request. There is no `admin_access_token` in `localStorage` and no `Authorization` header.

- On a `401`, `adminFetch`/`adminUpload` transparently POST `/backend-api/auth/refresh` once (cookie-based) and retry the original call; concurrent 401s share a single in-flight refresh so there's no request stampede. If refresh fails, the user is redirected to `/admin/login`.
- `src/middleware.ts` gates `/admin/*` (except `/admin/login`) on the mere *presence* of the `access_token` cookie, redirecting to `/admin/login` if it's missing. This is a cheap presence check, not JWT verification — the client-side `AdminAuthGuard` (calls `GET /api/auth/me`) and the backend's own JWT validation remain the real enforcement.
- Public reads (`lib/api.ts`) are ISR-cached server-side fetches straight to `NEXT_PUBLIC_API_URL` and need no cookies, so they bypass the proxy entirely.

### Admin Sidebar Navigation

| Section | Path | Purpose |
|---|---|---|
| Dashboard | `/admin` | Overview |
| Pages & Sections | `/admin/pages` | Create/edit CMS pages, add/reorder/configure sections |
| Projects | `/admin/projects` | CRUD for portfolio projects |
| Blog | `/admin/blog` | CRUD for blog posts |
| Skills | `/admin/skills` | Manage skill groups and proficiency levels |
| Experience | `/admin/experience` | Work history entries |
| Education | `/admin/education` | Education entries |
| Achievements | `/admin/achievements` | Awards and certifications |
| Media | `/admin/media` | Cloudinary media library (view-only) |
| Messages | `/admin/messages` | Contact form inbox with unread indicator |
| Configuration | `/admin/config` | Editable config lists (skill groups, etc.) |
| Settings | `/admin/settings` | Site name, tagline, socials, OG defaults, default theme |

### Deferred Image Upload

Images are never uploaded at the moment a file is selected. The `ImageUpload` component holds new picks as local `objectURL` previews. When the form is saved, `reconcileMultiMedia` (for screenshot arrays) or `reconcileSingleMedia` (for single images like logos and OG images) in `src/lib/media-save.ts` runs the reconcile pass:

1. Deletes media records that were removed from the list (hard-delete from Cloudinary via the backend).
2. Uploads pending local files with the entity linked as owner.
3. Patches `order` and `alt` for unchanged existing items.

Errors are returned as human-readable strings and surfaced as warning toasts without blocking the save.

---

## Project Structure

```
src/
├── middleware.ts               # Gates /admin/* on access_token cookie presence
├── app/
│   ├── (public)/              # Public-facing pages
│   └── admin/                 # Admin CMS pages
├── components/
│   ├── sections/              # SectionRenderer + one component per section type
│   ├── pagedetail/            # Detail view components (project, blog, experience, education, achievement)
│   ├── projects/              # screenshot-lightbox
│   ├── admin/                 # Admin UI: sidebar, shell, image-upload, section-data-form, toast, ui primitives
│   ├── layout/                # Navbar, Footer, ParticlesBackground
│   └── ui/                    # Shared primitives: Button, Tag, SkillIcon, ThemeToggle, ThemeProvider, SectionHeading, SectionCta, ErrorState
└── lib/
    ├── api.ts                 # Typed ISR fetch client + cache tags for all public API reads (server-side, direct to backend)
    ├── admin-api.ts           # Authenticated admin API client — same-origin via /backend-api proxy, cookie-only auth
    ├── types.ts               # TypeScript mirror of the backend Prisma schema
    ├── seo.ts                 # buildPageMetadata — shared CMS-driven metadata builder
    ├── media-save.ts          # Deferred upload reconcile helpers
    ├── media.ts               # Media category constants
    ├── site.ts                # SITE_OWNER, SITE_TITLE, SITE_TITLE_TEMPLATE constants
    ├── nav-links.ts           # navLinksFromPages — converts NavPage[] to {label, href}[]
    ├── socials.ts             # Social link helpers
    ├── contact-link-types.ts  # Contact link type definitions
    ├── strip-quoted.ts        # String utility
    └── utils.ts               # cn() class-merge utility
```

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- The `portfolio-backend` NestJS API running and accessible (default: `http://localhost:4000`)

### Install dependencies

```bash
npm install
```

### Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000` | Base URL of the NestJS backend. Used server-side by `lib/api.ts` (public reads) and by the `/backend-api/*` rewrite proxy that admin writes go through |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` | Canonical public URL (used in sitemap and OG metadata) |
| `NEXT_PUBLIC_SITE_OWNER` | No | `Rohit Malviya` | Owner name used in page titles and metadata |
| `NEXT_PUBLIC_DEFAULT_THEME` | No | `dark` | First-visit theme: `dark` or `light` (OS preference and user toggle still apply) |

This is the complete set of env vars the code reads — nothing else is used.

> Auth is handled entirely by the NestJS backend (httpOnly `access_token` / `refresh_token` cookies + JWT strategy). The frontend does not sign or store its own session — see "Admin auth & the `/backend-api` proxy" below.

### Run the development server

```bash
npm run dev
```

The public site is available at `http://localhost:3000`. The admin CMS is at `http://localhost:3000/admin`.

### Other scripts

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Next.js dev server with HMR |
| Production build | `npm run build` | Generates a standalone output in `.next/` |
| Production start | `npm run start` | Serves the production build |
| Lint | `npm run lint` | ESLint via `eslint-config-next` |
| Type check | `npm run type-check` | `tsc --noEmit` without emitting files |

---

## Notes

### Image hosting

`next.config.ts` whitelists two remote image hosts for `next/image`:

- `res.cloudinary.com` — all Cloudinary-hosted media (project screenshots, logos, blog covers, gallery images)
- `images.unsplash.com` — placeholder or curated imagery

Any other remote image host will be blocked by Next.js at runtime.

### Security headers

Every response includes the following headers (applied globally in `next.config.ts`):

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Caching — ISR with on-demand invalidation

Public reads are cached and **tagged** (`CACHE_TAGS` in `lib/api.ts`). Two things invalidate them:

1. **An admin save.** `adminFetch`/`adminUpload` POST `/api/revalidate` after any successful mutation, which calls `revalidateTag` for the affected content. An edit is therefore live on the very next request — there is no window to wait out. This is wired into the API client rather than into individual admin pages, so a new mutation cannot forget to invalidate.
2. **A 10-minute window**, as a backstop for the rare case where that call is lost.

Why this matters beyond freshness: the backend runs on **Cloud Run with `min-instances=0`** and the database is **Neon, which autosuspends**. A measured cold start — container boot, Prisma `$connect()`, Neon wake — took **16.9 seconds**. Serving a cached render means visitors never wait on that; ISR is stale-while-revalidate, so the page is returned immediately and the origin wakes in the background.

`/api/revalidate` authenticates by forwarding the caller's cookies to the backend's `/auth/me`. There is no shared secret, because the admin is client-rendered and any secret would have to reach the browser.

**Timeouts.** `lib/api.ts` allows 20s per request. The previous 8s × 2 attempts gave a 16.3s budget, which was *just* under that 16.9s cold start — so both attempts aborted and pages rendered empty. Retries now apply to fast 5xx failures only, never to timeouts: retrying after a 20s abort would double the budget and exceed Vercel's function limit for no gain. Public routes set `maxDuration = 30` to leave headroom on a cache miss.

When the backend is unreachable, `lib/api.ts` still returns `null` or an empty array — pages render empty states rather than throwing, and the previously cached copy keeps serving visitors meanwhile.

Browser-originated calls (`getConfigOptions`, `submitContact`) stay uncached — they're client mutations and dropdown reads, not page renders.

### Theme

A no-flash inline script in the root layout reads `localStorage('theme')` and applies `data-theme` to `<html>` synchronously before any CSS or React hydration, preventing a flash of wrong theme on first paint. The default theme is controlled by `NEXT_PUBLIC_DEFAULT_THEME`.

### Standalone output

The production build uses `output: 'standalone'` in `next.config.ts`, which bundles only the necessary `node_modules` into `.next/standalone/`. This makes the build suitable for running in a minimal Docker container without installing all dependencies.
