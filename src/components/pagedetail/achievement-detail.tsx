// ============================================================
//  AchievementDetail — detail view for a single Achievement.
//  Design language matches ProjectDetail:
//    back link · two-column hero (content left, image right) .
//  Unlike ProjectDetail the image is NOT cropped to aspect-video —
//  certificates are usually portrait and award photos landscape,
//  so it keeps its own ratio (see the right column below).
//  ScreenshotLightbox provides click-to-zoom.
//  Server component.
// ============================================================

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Trophy } from 'lucide-react';
import { ScreenshotLightbox, LightboxTrigger } from '@/components/projects/screenshot-lightbox';
import type { Achievement } from '@/lib/types';

export function AchievementDetail({ item }: { item: Achievement }) {
  const year = item.date ? new Date(item.date).getFullYear() : null;
  const lightboxImages = item.image ? [{ url: item.image, alt: item.title }] : [];

  return (
    <div className="py-12">
      <ScreenshotLightbox screenshots={lightboxImages}>
      <div className="wrap">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-[13px] text-[--muted] hover:text-[--accent] transition-colors duration-150 mb-10"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </Link>

        {/* ── HERO ─────────────────────────────────────────── */}
        {/* Same grid as ProjectDetail: content left, image right,
            collapsing to a single column below lg. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14 items-start">
          {/* Left: title, date, description */}
          <div>
            <h1 className="font-display font-bold text-[clamp(28px,4vw,44px)] leading-[1.1] tracking-[-1px] text-[--text] mb-3">
              {item.title}
            </h1>

            {year !== null && (
              <p className="font-mono text-[14px] text-[--accent] mb-6">{year}</p>
            )}

            <section aria-labelledby="description-heading">
              <h2
                id="description-heading"
                className="font-display font-semibold text-[20px] text-[--text] mb-4 pb-3 border-b border-[--border] tracking-[-0.3px]"
              >
                About this achievement
              </h2>
              <p className="text-[--muted] text-[16px] leading-[1.75]">{item.description}</p>
            </section>
          </div>

          {/* Right: award image.
              No aspect-video / object-cover here — both CSS dimensions are
              `auto` so the browser uses the image's own ratio, bounded by the
              column width and a height cap. A portrait certificate stays
              portrait; a landscape photo stays landscape. */}
          <div>
            {item.image ? (
              <div className="relative inline-block max-w-full">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={1200}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className="block w-auto h-auto max-w-full max-h-[620px] rounded-[16px] border border-[--border]"
                />
                <LightboxTrigger
                  index={0}
                  ariaLabel={`View ${item.title} full size`}
                  className="absolute inset-0 rounded-[16px] z-10 cursor-zoom-in transition-colors hover:bg-black/10"
                />
              </div>
            ) : (
              // Mirrors ProjectDetail's placeholder so an achievement with no
              // image still balances the two-column layout.
              <div
                className="rounded-[16px] border border-[--border] aspect-video flex items-center justify-center bg-gradient-to-br from-[--thumb-from] to-[--thumb-to] text-[--accent]"
                aria-hidden="true"
              >
                <Trophy size={40} />
              </div>
            )}
          </div>
        </div>
      </div>
      </ScreenshotLightbox>
    </div>
  );
}
