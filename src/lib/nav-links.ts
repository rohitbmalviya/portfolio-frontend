import type { NavPage } from './types';

export interface NavLinkBase {
  label: string;
  href: string;
}

/**
 * Converts nav pages (from GET /api/pages/nav) into {label, href} links.
 * Shared by the navbar and the footer so both render the same nav.
 *   label = navLabel ?? title (lowercased) · href = '/' for home, else '/{slug}'
 */
export function navLinksFromPages(pages: NavPage[]): NavLinkBase[] {
  return pages.map((p) => ({
    label: (p.navLabel ?? p.title).toLowerCase(),
    href: p.slug === 'home' ? '/' : `/${p.slug}`,
  }));
}

/**
 * Splits a list of nav items into the items shown inline and the "overflow"
 * items (collapsed into a "More" dropdown by the navbar). When `items.length`
 * is at or below `maxInline`, everything stays inline and overflow is empty.
 */
export function splitNavItems<T>(
  items: T[],
  maxInline: number,
): { inline: T[]; overflow: T[] } {
  if (items.length <= maxInline) {
    return { inline: items, overflow: [] };
  }
  return { inline: items.slice(0, maxInline), overflow: items.slice(maxInline) };
}
