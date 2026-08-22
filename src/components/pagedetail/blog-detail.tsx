// ============================================================
//  BlogDetail — reusable detail view for a single BlogPost.
//  Extracted from (public)/blog/[slug]/page.tsx so the same
//  markup can be served by both the legacy /blog/[slug] route
//  and the unified /[slug]/[item] route without duplication.
//  Server component.
// ============================================================

import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { ScreenshotLightbox, LightboxTrigger, LightboxImg } from '@/components/projects/screenshot-lightbox';
import { formatBlogDate, readingTimeLabel } from '@/lib/utils';
import { resolveBackLink } from '@/lib/collection-links';
import type { BlogPost } from '@/lib/types';

export async function BlogDetail({ post }: { post: BlogPost }) {
  // All zoomable images on this post: cover first, then markdown body images.
  const bodyImageUrls = post.body
    ? [...post.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1])
    : [];
  const lightboxImages = [
    ...(post.coverImage ? [{ url: post.coverImage, alt: post.title }] : []),
    ...bodyImageUrls.map((url) => ({ url, alt: '' })),
  ];

  // Resolved from the CMS rather than hardcoded to "/blog": if that page is
  // renamed or unpublished this falls back to home instead of 404-ing, and
  // the label follows the page's own name.
  const back = await resolveBackLink('blog');

  return (
    <div className="py-12">
      <div className="wrap">
        {/* Back */}
        <Link
          href={back.href}
          className="inline-flex items-center gap-2 font-mono text-[13px] text-[--muted] hover:text-[--accent] transition-colors duration-150 mb-10"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {back.label}
        </Link>

        <ScreenshotLightbox screenshots={lightboxImages}>
        <article className="max-w-[720px]">
          {/* Header */}
          <header className="mb-10">
            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            )}

            <h1 className="font-display font-bold text-[clamp(26px,4vw,40px)] leading-[1.15] tracking-[-0.8px] text-[--text] mb-5">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-5 font-mono text-[12px] text-[--muted] pb-6 border-b border-[--border]">
              {post.publishedAt && (
                <span className="flex items-center gap-2">
                  <Calendar size={13} aria-hidden="true" />
                  <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
                </span>
              )}
              {post.readingTime && (
                <span className="flex items-center gap-2">
                  <Clock size={13} aria-hidden="true" />
                  {readingTimeLabel(post.readingTime)}
                </span>
              )}
            </div>
          </header>

          {/* Cover image */}
          {post.coverImage && (
            <div className="relative aspect-[21/9] rounded-[12px] overflow-hidden border border-[--border] mb-10">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                sizes="(max-width: 720px) 100vw, 720px"
                className="object-cover"
                priority
              />
              <LightboxTrigger
                index={0}
                ariaLabel="View cover image full size"
                className="absolute inset-0 z-10 cursor-zoom-in transition-colors hover:bg-black/10"
              />
            </div>
          )}

          {/* Excerpt */}
          <p className="text-[--muted] text-[18px] leading-[1.7] mb-8 italic border-l-2 border-[--accent] pl-4">
            {post.excerpt}
          </p>

          {/* Body */}
          {post.body && post.body.trim() !== '' ? (
            <div className="prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug, rehypeHighlight]}
                components={{ img: LightboxImg }}
              >
                {post.body}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="bg-[--surface] border border-[--border] rounded-[12px] p-8 text-center">
              <p className="font-mono text-[--muted] text-[13px] mb-2">{'// full post coming soon'}</p>
              <p className="text-[--muted] text-[14px]">
                This post is being drafted. Check back shortly.
              </p>
            </div>
          )}
        </article>
        </ScreenshotLightbox>
      </div>
    </div>
  );
}
