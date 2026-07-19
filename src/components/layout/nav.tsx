'use client';

// ============================================================
//  Nav — sticky, backdrop-blur, 64px, mono logo, nav links
//  with section numbers, theme toggle. Mobile: hamburger menu.
//
//  Links come from GET /api/pages/nav (fetched server-side in
//  the public layout and passed as `navItems`). When the list
//  is empty the nav bar still renders logo and theme toggle.
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Menu, X, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { navLinksFromPages, splitNavItems } from '@/lib/nav-links';
import { resolveSiteName, siteNameToLogoWords } from '@/lib/site';
import type { NavPage, SiteSettings } from '@/lib/types';

// ── Constants ─────────────────────────────────────────────────

/** Max nav items shown inline on desktop before the rest collapse into "More". */
const MAX_INLINE_NAV_ITEMS = 5;

// ── Helpers ───────────────────────────────────────────────────

interface NavLink {
  num: string;
  label: string;
  href: string;
}

function toNavLinks(pages: NavPage[]): NavLink[] {
  // Shared label/href logic (also used by the footer); the navbar adds a number.
  return navLinksFromPages(pages).map((l, i) => ({
    num: String(i + 1).padStart(2, '0'),
    ...l,
  }));
}

/** Whether `href` matches (or is a parent route of) the current pathname. */
function isActiveHref(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Component ─────────────────────────────────────────────────

interface NavProps {
  /** Pre-fetched nav pages from the server layout (GET /api/pages/nav). */
  navItems?: NavPage[];
  /** Passed from the server layout after fetching getSiteSettings(). */
  settings?: SiteSettings | null;
}

export function Nav({ navItems, settings }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const effectiveItems = navItems ?? [];
  const NAV_LINKS = toNavLinks(effectiveItems);
  const { inline: inlineLinks, overflow: overflowLinks } = splitNavItems(
    NAV_LINKS,
    MAX_INLINE_NAV_ITEMS,
  );
  const isOverflowActive = overflowLinks.some((link) => isActiveHref(pathname, link.href));

  const displayName = resolveSiteName(settings?.name);
  const logoWords = siteNameToLogoWords(displayName);

  return (
    <nav
      className={cn(
        'sticky top-0 z-20 backdrop-blur-[10px]',
        'bg-[--nav-bg] border-b border-[--border]',
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="wrap flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="font-mono font-medium tracking-[0.5px] text-[--text] hover:text-[--text] focus-visible:outline-[--accent]"
          aria-label={`${displayName} — home`}
        >
          {logoWords.map((word, i) => (
            <span key={i}>
              {i > 0 && <span className="text-[--accent]">.</span>}
              {word}
            </span>
          ))}
        </Link>

        {/* Desktop nav links + toggle */}
        <div className="hidden md:flex items-center gap-[26px]">
          <ul className="flex items-center gap-[26px] text-[14px] text-[--muted] list-none" role="list">
            {inlineLinks.map((link) => {
              const active = isActiveHref(pathname, link.href);
              return (
                <li key={link.num}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'hover:text-[--text] transition-colors duration-150 focus-visible:outline-[--accent]',
                      active && 'text-[--text] font-medium',
                    )}
                  >
                    <span className="font-mono text-[--accent] text-[12px] mr-[5px]" aria-hidden="true">
                      {link.num}
                    </span>
                    {link.label}
                  </Link>
                </li>
              );
            })}

            {overflowLinks.length > 0 && (
              <li>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'group flex items-center gap-1 hover:text-[--text] transition-colors duration-150',
                        'outline-none focus-visible:outline-[--accent]',
                        isOverflowActive && 'text-[--text] font-medium',
                      )}
                    >
                      More
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className="transition-transform duration-150 group-data-[state=open]:rotate-180"
                      />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={16}
                      className={cn(
                        'z-30 min-w-[180px] rounded-[10px] border border-[--border] bg-[--surface]',
                        'py-2 shadow-[var(--card-shadow)] outline-none',
                      )}
                    >
                      {overflowLinks.map((link) => {
                        const active = isActiveHref(pathname, link.href);
                        return (
                          <DropdownMenu.Item key={link.num} asChild>
                            <Link
                              href={link.href}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'flex items-center gap-[5px] px-4 py-2 text-[14px] text-[--muted]',
                                'hover:text-[--text] hover:bg-[--surface-2] transition-colors duration-150',
                                'outline-none focus-visible:text-[--text] focus-visible:bg-[--surface-2]',
                                active && 'text-[--text] font-medium',
                              )}
                            >
                              <span className="font-mono text-[--accent] text-[12px]" aria-hidden="true">
                                {link.num}
                              </span>
                              {link.label}
                            </Link>
                          </DropdownMenu.Item>
                        );
                      })}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </li>
            )}
          </ul>
          <ThemeToggle />
        </div>

        {/* Mobile: toggle + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className={cn(
              'w-[38px] h-[38px] rounded-[10px] border grid place-items-center',
              'text-[--muted] border-[--border] bg-[--surface]',
              'hover:text-[--accent] hover:border-[--accent] transition-colors duration-200',
            )}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-[--border] bg-[--surface] py-4"
          role="menu"
        >
          <ul className="flex flex-col gap-1 px-6 list-none" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.num} role="none">
                <Link
                  href={link.href}
                  role="menuitem"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 py-3 text-[15px] text-[--muted]',
                    'hover:text-[--text] transition-colors duration-150',
                    'border-b border-[--border] last:border-b-0',
                  )}
                >
                  <span className="font-mono text-[--accent] text-[12px]">{link.num}</span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
