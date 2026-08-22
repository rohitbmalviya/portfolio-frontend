// ============================================================
//  (public) group layout — Nav + Footer wrapper.
//  Leaves room for app/(admin) to have its own layout.
//
//  This is a Server Component: it fetches nav pages (ISR-cached,
//  invalidated on admin save) and passes them to the client Nav.
//  If the API is unreachable, getNav() returns [] and Nav
//  falls back to its built-in static link set.
// ============================================================

import { Nav } from '@/components/layout/nav';
import { Footer } from '@/components/layout/footer';
import { ParticlesBackground } from '@/components/layout/particles-background';
import { getNav, getSiteSettings } from '@/lib/api';

export const revalidate = 600;

// Vercel kills a function at its duration limit. The API client allows a 20s
// timeout to survive a backend cold start, so this route needs headroom above
// that on the rare render that misses the cache.
export const maxDuration = 30;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch in parallel — both are ISR-cached, so this is a cache read
  // on all but the first request after an invalidation.
  const [navItems, settings] = await Promise.all([getNav(), getSiteSettings()]);

  return (
    <>
      {/* Constellation background — fixed, behind everything (z-0) */}
      <ParticlesBackground />

      {/* Content sits above the canvas.
          min-h keeps the footer at the bottom when a page renders no
          sections — without it <main> collapses to zero height and the
          footer lands directly under the nav, which reads as a broken
          page. Matches the treatment already used in app/not-found.tsx. */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav navItems={navItems} settings={settings} />
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer navItems={navItems} settings={settings} />
      </div>
    </>
  );
}
