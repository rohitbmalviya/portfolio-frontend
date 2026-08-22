// ============================================================
//  not-found.tsx — On-brand 404 page. No layout injection
//  needed — Next.js uses the nearest layout automatically.
//
//  Async Server Component: fetches nav pages + site settings
//  (in parallel, same as (public)/layout.tsx) so Nav/Footer
//  render with real data instead of their empty fallbacks.
// ============================================================

import { LinkButton } from '@/components/ui/button';
import { Nav } from '@/components/layout/nav';
import { Footer } from '@/components/layout/footer';
import { getNav, getSiteSettings } from '@/lib/api';
import { navLinksFromPages } from '@/lib/nav-links';
import { resolveSiteName, siteNameToLogoWords } from '@/lib/site';

/** How many CMS shortcuts to offer alongside Home. */
const MAX_SHORTCUTS = 3;

export default async function NotFound() {
  const [navItems, settings] = await Promise.all([getNav(), getSiteSettings()]);
  const logoText = siteNameToLogoWords(resolveSiteName(settings?.name)).join('.');

  // Shortcuts come from the nav rather than being hardcoded to Projects/Blog.
  // Those are admin-owned CMS pages — hardcoding them meant a 404 page that
  // could itself link to a 404 if either was renamed or unpublished. Home is
  // rendered separately below since it is a fixed route, not a CMS slug.
  const shortcuts = navLinksFromPages(navItems)
    .filter((l) => l.href !== '/')
    .slice(0, MAX_SHORTCUTS);

  return (
    <>
      <Nav navItems={navItems} settings={settings} />
      <main
        className="min-h-[70vh] flex flex-col items-center justify-center py-24 text-center"
        id="main-content"
      >
        <div className="wrap max-w-[520px] mx-auto">
          {/* Mono 404 */}
          <p className="font-mono text-[--accent] text-[13px] tracking-[2px] mb-4">{'// 404'}</p>

          <h1
            className="font-display font-bold leading-[1.05] tracking-[-1.5px] mb-5"
            style={{ fontSize: 'clamp(48px, 8vw, 80px)' }}
          >
            <span className="bg-gradient-to-r from-[--grad-from] to-[--grad-to] bg-clip-text text-transparent">
              Not found.
            </span>
          </h1>

          <p className="text-[--muted] text-[18px] leading-relaxed mb-8">
            This page doesn&apos;t exist. It may have moved, or the URL is wrong. Let&apos;s get you back
            on track.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <LinkButton href="/" variant="primary">
              ← Home
            </LinkButton>
            {shortcuts.map((link) => (
              <LinkButton key={link.href} href={link.href} variant="ghost">
                <span className="capitalize">{link.label}</span>
              </LinkButton>
            ))}
          </div>

          {/* Decorative mono line */}
          <p className="font-mono text-[12px] text-[--border] mt-12">
            {logoText} · 404 · page not found
          </p>
        </div>
      </main>
      <Footer navItems={navItems} settings={settings} />
    </>
  );
}
