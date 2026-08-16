// ============================================================
//  ProjectCard — matches the sample card exactly.
//  hover: border-accent + lift + shadow + glow ring.
//  Server component.
// ============================================================

import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Star } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import type { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  // Thumbnail precedence:
  //   1. previewImage — auto-captured screenshot of the live site
  //   2. screenshots[0] — the manually uploaded image
  //   3. neither — gradient placeholder below
  // (2) also covers the case where the project has a liveUrl but the capture
  // failed or hasn't finished yet, since previewImage is null until it lands.
  const uploaded = project.screenshots?.[0];
  const thumbnail = project.previewImage
    ? { url: project.previewImage, alt: `${project.title} — live site preview` }
    : uploaded
      ? { url: uploaded.url, alt: uploaded.alt || project.title }
      : null;

  return (
    <article
      className={[
        'relative group bg-[--surface] border border-[--border] rounded-[16px] overflow-hidden',
        'transition-all duration-[250ms]',
        'hover:border-[--accent] hover:-translate-y-[4px]',
        'hover:shadow-[var(--card-shadow),0_0_0_1px_var(--accent-glow)]',
      ].join(' ')}
    >
      {/* Stretched link — the entire card navigates to the detail page */}
      <Link
        href={`/projects/${project.slug}`}
        aria-label={project.title}
        className="absolute inset-0 z-[1]"
      />

      {/* Thumbnail */}
      <div
        className={[
          'h-[150px] border-b border-[--border] relative flex items-center justify-center',
          'font-mono text-[12px] text-[--muted]',
          thumbnail ? '' : 'bg-gradient-to-br from-[--thumb-from] to-[--thumb-to]',
        ].join(' ')}
        aria-hidden={!thumbnail}
      >
        {thumbnail ? (
          <Image
            src={thumbnail.url}
            alt={thumbnail.alt}
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
            className="object-cover object-top"
          />
        ) : (
          <span className="select-none">[ screenshot ]</span>
        )}

        {/* Featured star */}
        {project.featured && (
          <span className="absolute top-3 right-3 text-[--accent]" aria-label="Featured project">
            <Star size={14} fill="currentColor" aria-hidden="true" />
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="px-[22px] pt-5 pb-6">
        <h3 className="font-display text-[18px] font-semibold mb-[6px] text-[--text] tracking-[-0.3px] group-hover:text-[--accent] transition-colors duration-150">
          {project.title}
        </h3>
        <p className="font-mono text-[13px] text-[--accent] mb-[10px]">{project.role}</p>
        <p className="text-[--muted] text-[14px] mb-[14px] leading-[1.6]">{project.oneLiner}</p>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Technologies used">
            {project.tags.slice(0, 5).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}

        {/* Links row sits above the stretched card-link but is itself
            click-through (pointer-events-none); only "Live demo" opts back in,
            so clicking anywhere else still navigates to the detail page. */}
        {project.liveUrl && (
          <div className="relative z-[2] pointer-events-none flex flex-wrap items-center gap-[18px] text-[13px] mt-1">
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto text-[--accent] hover:opacity-75 transition-opacity flex items-center gap-1"
              aria-label={`${project.title} — live demo (opens in new tab)`}
            >
              Live demo
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
