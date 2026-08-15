// ============================================================
//  Dynamic CMS page — /:slug
//  Renders ANY published page created in the admin (e.g. /contact,
//  /testing) by fetching GET /api/pages/:slug and rendering its
//  sections. Static routes (/, /projects, /blog) take precedence,
//  so this only handles everything else.
//  ISR: revalidate every 60s.
// ============================================================

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPage, getPages } from '@/lib/api';
import { OG_IMAGE_PATH } from '@/lib/site';
import { SectionRenderer } from '@/components/sections/section-renderer';

export const revalidate = 60;

// Slugs that already have their own dedicated, hand-built route.
// Excluded here so we never shadow or duplicate them.
const RESERVED_SLUGS = new Set(['home', 'projects', 'blog']);

interface Props {
  params: Promise<{ slug: string }>;
}

// Pre-render known CMS pages at build; new pages still render on-demand
// (dynamicParams defaults to true).
export async function generateStaticParams() {
  const pages = await getPages();
  return pages
    .filter((p) => !RESERVED_SLUGS.has(p.slug))
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};

  const title = page.metaTitle ?? page.title;
  const description = page.metaDescription ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      // Must name an image explicitly: this object replaces the root layout's
      // `openGraph` entirely, so leaving `images` out (or setting it to
      // undefined/[]) means the page ships with no card at all.
      images: [{ url: page.ogImage || OG_IMAGE_PATH }],
    },
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;

  // The home page lives at "/", so canonicalise /home → /.
  if (slug === 'home') redirect('/');

  const page = await getPage(slug);
  // getPage returns null for a missing or unpublished page → real 404.
  if (!page) notFound();

  return <SectionRenderer sections={page.sections ?? []} />;
}
