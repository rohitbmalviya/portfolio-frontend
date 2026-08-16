// ============================================================
//  Dynamic CMS page — /:slug
//  Renders ANY published page created in the admin (e.g. /contact,
//  /testing) by fetching GET /api/pages/:slug and rendering its
//  sections.
//  Rendered on every request — no caching, always live API data.
// ============================================================

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPage } from '@/lib/api';
import { OG_IMAGE_PATH } from '@/lib/site';
import { SectionRenderer } from '@/components/sections/section-renderer';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
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
