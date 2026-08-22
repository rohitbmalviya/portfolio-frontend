// ============================================================
//  ProjectDetail — reusable detail view for a single Project.
//  Extracted from (public)/projects/[slug]/page.tsx so the same
//  markup can be served by both the legacy /projects/[slug] route
//  and the unified /[slug]/[item] route without duplication.
//  Server component.
// ============================================================

import Image from 'next/image';
import Link from 'next/link';
import { ScreenshotLightbox, LightboxTrigger } from '@/components/projects/screenshot-lightbox';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { LinkButton } from '@/components/ui/button';
import { resolveBackLink } from '@/lib/collection-links';
import type { Project } from '@/lib/types';

export async function ProjectDetail({ project }: { project: Project }) {
  const hasScreenshot = project.screenshots && project.screenshots.length > 0;

  // Resolved from the CMS rather than hardcoded to "/projects": if that page
  // is renamed or unpublished this falls back to home instead of 404-ing,
  // and the label follows the page's own name.
  const back = await resolveBackLink('projects');

  return (
    <div className="py-12">
      <ScreenshotLightbox screenshots={project.screenshots}>
      <div className="wrap">
        {/* Back */}
        <Link
          href={back.href}
          className="inline-flex items-center gap-2 font-mono text-[13px] text-[--muted] hover:text-[--accent] transition-colors duration-150 mb-10"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {back.label}
        </Link>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14 items-start">
          {/* Left: meta */}
          <div>
            <h1 className="font-display font-bold text-[clamp(28px,4vw,44px)] leading-[1.1] tracking-[-1px] text-[--text] mb-3">
              {project.title}
            </h1>

            <p className="font-mono text-[14px] text-[--accent] mb-4">{project.role}</p>

            <p className="text-[--muted] text-[17px] leading-relaxed mb-6">{project.oneLiner}</p>

            {/* Stack tags */}
            {project.stack.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6" aria-label="Tech stack">
                {project.stack.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}

            {/* Metric */}
            {project.metric && (
              <p className="font-mono text-[12px] text-[--muted] mb-6">{project.metric}</p>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              {project.liveUrl && (
                <LinkButton
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  aria-label={`${project.title} — live demo (opens in new tab)`}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Live demo
                </LinkButton>
              )}
            </div>
          </div>

          {/* Right: hero screenshot */}
          <div
            className={[
              'rounded-[16px] overflow-hidden border border-[--border]',
              'aspect-video relative',
              !hasScreenshot
                ? 'bg-gradient-to-br from-[--thumb-from] to-[--thumb-to] flex items-center justify-center'
                : '',
            ].join(' ')}
          >
            {hasScreenshot ? (
              <>
                <Image
                  src={project.screenshots[0].url}
                  alt={project.screenshots[0].alt || project.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
                <LightboxTrigger
                  index={0}
                  ariaLabel="View screenshot full size"
                  className="absolute inset-0 z-10 cursor-zoom-in transition-colors hover:bg-black/10"
                />
              </>
            ) : (
              <span className="font-mono text-[12px] text-[--muted] select-none">
                [ screenshot ]
              </span>
            )}
          </div>
        </div>

        {/* ── CONTENT ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          <div className="space-y-10">

            {/* Overview */}
            <section aria-labelledby="overview-heading">
              <h2
                id="overview-heading"
                className="font-display font-semibold text-[20px] text-[--text] mb-4 pb-3 border-b border-[--border] tracking-[-0.3px]"
              >
                Overview
              </h2>
              <p className="text-[--muted] text-[16px] leading-[1.75]">{project.overview}</p>
            </section>

            {/* My Contribution */}
            <section aria-labelledby="contribution-heading">
              <h2
                id="contribution-heading"
                className="font-display font-semibold text-[20px] text-[--text] mb-4 pb-3 border-b border-[--border] tracking-[-0.3px]"
              >
                My Contribution
              </h2>
              <p className="text-[--muted] text-[16px] leading-[1.75]">{project.contribution}</p>
            </section>

            {/* Full body (MDX/markdown) */}
            {project.body && project.body.trim() !== '' && (
              <section aria-label="Project deep dive">
                <div className="prose">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug, rehypeHighlight]}
                  >
                    {project.body}
                  </ReactMarkdown>
                </div>
              </section>
            )}

          </div>

          {/* Sidebar: tech stack + key metrics */}
          <aside className="space-y-6">
            {/* Tech stack */}
            {project.stack.length > 0 && (
              <div className="bg-[--surface] border border-[--border] rounded-[14px] p-5">
                <h3 className="font-mono text-[12px] text-[--accent] mb-3 tracking-[0.5px]">
                  {'// TECH STACK'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.stack.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Key metric */}
            {project.metric && (
              <div className="bg-[--surface] border border-[--border] rounded-[14px] p-5">
                <h3 className="font-mono text-[12px] text-[--accent] mb-3 tracking-[0.5px]">
                  {'// KEY METRICS'}
                </h3>
                <p className="text-[--muted] text-[13px] leading-relaxed">{project.metric}</p>
              </div>
            )}

            {/* Additional screenshots */}
            {project.screenshots.length > 1 && (
              <div className="bg-[--surface] border border-[--border] rounded-[14px] p-5">
                <h3 className="font-mono text-[12px] text-[--accent] mb-3 tracking-[0.5px]">
                  {'// SCREENSHOTS'}
                </h3>
                <div className="space-y-3">
                  {project.screenshots.slice(1).map((s, i) => (
                    <div key={i} className="relative aspect-video rounded-[8px] overflow-hidden border border-[--border]">
                      <Image
                        src={s.url}
                        alt={s.alt || `${project.title} screenshot ${i + 2}`}
                        fill
                        sizes="280px"
                        className="object-cover"
                      />
                      <LightboxTrigger
                        index={i + 1}
                        ariaLabel={`View screenshot ${i + 2} full size`}
                        className="absolute inset-0 z-10 cursor-zoom-in transition-colors hover:bg-black/10"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
      </ScreenshotLightbox>
    </div>
  );
}
