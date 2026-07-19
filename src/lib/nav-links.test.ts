import { describe, expect, it } from 'vitest';
import { navLinksFromPages, splitNavItems } from './nav-links';
import type { NavPage } from './types';

describe('navLinksFromPages', () => {
  it('maps the home page slug to href "/"', () => {
    const pages: NavPage[] = [{ slug: 'home', title: 'Home', navOrder: 0 }];

    const result = navLinksFromPages(pages);

    expect(result).toEqual([{ label: 'home', href: '/' }]);
  });

  it('maps non-home slugs to "/{slug}"', () => {
    const pages: NavPage[] = [
      { slug: 'about', title: 'About', navOrder: 1 },
      { slug: 'projects', title: 'Projects', navOrder: 2 },
    ];

    const result = navLinksFromPages(pages);

    expect(result).toEqual([
      { label: 'about', href: '/about' },
      { label: 'projects', href: '/projects' },
    ]);
  });

  it('prefers navLabel over title, and lowercases the label', () => {
    const pages: NavPage[] = [
      { slug: 'blog', title: 'Blog Posts', navLabel: 'Writing', navOrder: 1 },
    ];

    const result = navLinksFromPages(pages);

    expect(result).toEqual([{ label: 'writing', href: '/blog' }]);
  });

  it('falls back to the lowercased title when navLabel is null or absent', () => {
    const pages: NavPage[] = [
      { slug: 'contact', title: 'Contact Me', navLabel: null, navOrder: 1 },
    ];

    const result = navLinksFromPages(pages);

    expect(result).toEqual([{ label: 'contact me', href: '/contact' }]);
  });

  it('returns an empty array for an empty pages list', () => {
    expect(navLinksFromPages([])).toEqual([]);
  });
});

describe('splitNavItems', () => {
  it('keeps everything inline when the count is at the threshold', () => {
    const items = [1, 2, 3, 4, 5];

    expect(splitNavItems(items, 5)).toEqual({ inline: [1, 2, 3, 4, 5], overflow: [] });
  });

  it('keeps everything inline when the count is below the threshold', () => {
    const items = [1, 2, 3];

    expect(splitNavItems(items, 5)).toEqual({ inline: [1, 2, 3], overflow: [] });
  });

  it('moves items past the threshold into overflow', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];

    expect(splitNavItems(items, 5)).toEqual({ inline: [1, 2, 3, 4, 5], overflow: [6, 7] });
  });

  it('handles an empty list', () => {
    expect(splitNavItems([], 5)).toEqual({ inline: [], overflow: [] });
  });
});
