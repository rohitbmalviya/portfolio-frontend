// ============================================================
//  (public) group layout — Nav + Footer wrapper.
//  Leaves room for app/(admin) to have its own layout.
//
//  This is a Server Component: it fetches nav pages on every
//  request (uncached) and passes them to the client Nav.
//  If the API is unreachable, getNav() returns [] and Nav
//  falls back to its built-in static link set.
// ============================================================

import { Nav } from '@/components/layout/nav';
import { Footer } from '@/components/layout/footer';
import { ParticlesBackground } from '@/components/layout/particles-background';
import { getNav, getSiteSettings } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch in parallel — two uncached round-trips to the API per request.
  const [navItems, settings] = await Promise.all([getNav(), getSiteSettings()]);

  return (
    <>
      {/* Constellation background — fixed, behind everything (z-0) */}
      <ParticlesBackground />

      {/* Content sits above the canvas */}
      <div className="relative z-10">
        <Nav navItems={navItems} settings={settings} />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer navItems={navItems} settings={settings} />
      </div>
    </>
  );
}
