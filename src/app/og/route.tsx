// ============================================================
//  /og — the default Open Graph card (1200x630 PNG).
//
//  This is a plain route handler rather than the `opengraph-image.tsx` file
//  convention, deliberately. Next only keeps a file-convention image when it
//  sits in the SAME route segment as the page that exports `openGraph` — and
//  nearly every public page here builds its own `openGraph` from the CMS
//  (see lib/seo.ts and (public)/[slug]). A file-convention image at any
//  ancestor segment gets dropped, silently, leaving links with no picture.
//
//  A fixed URL sidesteps that entirely: pages reference '/og' explicitly as
//  their fallback image, so it survives any metadata override. It also has no
//  content hash, which makes it stable across deploys and safe to hardcode.
//
//  Static (no CMS fetch): scrapers never run JS and give up quickly, so the
//  card must not depend on the backend being reachable. Identity comes from
//  the same env-configurable constants the metadata falls back to.
// ============================================================

import { ImageResponse } from 'next/og';
import { SITE_OWNER } from '@/lib/site';

export const runtime = 'edge';

const size = {
  width: 1200,
  height: 630,
};

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #0B0F17, #131C2B)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F2F5FA',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <div
            style={{
              background: 'linear-gradient(to bottom right, #22D3EE, #6366F1)',
              width: 160,
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 40,
              boxShadow: '0 20px 45px -10px rgba(34, 211, 238, 0.45)',
            }}
          >
            <svg width="110" height="110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 7L4.5 12L9 17" stroke="#0B0F17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 7L19.5 12L15 17" stroke="#0B0F17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.25 5.5L10.75 18.5" stroke="#0B0F17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            marginBottom: 20,
            textAlign: 'center',
            color: '#F2F5FA',
          }}
        >
          {SITE_OWNER}
        </h1>
        <p
          style={{
            fontSize: 36,
            color: '#94A3B8',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          Full-Stack Engineer — building fast, accessible products end to end.
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
