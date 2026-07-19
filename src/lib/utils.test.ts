import { describe, expect, it } from 'vitest';
import { cn, groupBy, formatDate, formatBlogDate, truncate, readingTimeLabel } from './utils';

describe('cn', () => {
  it('merges class names and resolves conflicting Tailwind utilities (last one wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('merges conditional class objects', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
});

describe('groupBy', () => {
  it('groups items into buckets by the given key function', () => {
    const items = [
      { id: 1, category: 'fruit' },
      { id: 2, category: 'veg' },
      { id: 3, category: 'fruit' },
    ];

    const result = groupBy(items, (item) => item.category);

    expect(result).toEqual({
      fruit: [
        { id: 1, category: 'fruit' },
        { id: 3, category: 'fruit' },
      ],
      veg: [{ id: 2, category: 'veg' }],
    });
  });

  it('returns an empty object for an empty array', () => {
    expect(groupBy<{ id: number }>([], (item) => String(item.id))).toEqual({});
  });
});

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string as "Mon YYYY"', () => {
    expect(formatDate('2026-06-15')).toBe('Jun 2026');
  });

  it('formats a full ISO datetime string as "Mon YYYY"', () => {
    expect(formatDate('2026-06-15T12:00:00.000Z')).toBe('Jun 2026');
  });

  it('returns the raw string unchanged for an empty value', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns "Invalid Date" for an unparsable date string (Date parsing never throws)', () => {
    // `new Date('not-a-date')` produces an Invalid Date object rather than
    // throwing, so `toLocaleDateString` resolves to the literal string
    // "Invalid Date" — the try/catch in formatDate never actually engages
    // for this input. Documented here so a future refactor doesn't assume
    // otherwise.
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('formatBlogDate', () => {
  it('formats an ISO date string as "Month D, YYYY"', () => {
    expect(formatBlogDate('2026-06-15T12:00:00.000Z')).toBe('June 15, 2026');
  });

  it('returns "Invalid Date" for an unparsable date string (Date parsing never throws)', () => {
    expect(formatBlogDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('truncate', () => {
  it('returns the string unchanged when it is within maxLen', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('truncates and appends an ellipsis when longer than maxLen', () => {
    expect(truncate('this is a long sentence', 10)).toBe('this is a…');
  });
});

describe('readingTimeLabel', () => {
  it('formats minutes into a "N min read" label', () => {
    expect(readingTimeLabel(5)).toBe('5 min read');
  });

  it('returns an empty string for null, undefined, or zero', () => {
    expect(readingTimeLabel(null)).toBe('');
    expect(readingTimeLabel(undefined)).toBe('');
    expect(readingTimeLabel(0)).toBe('');
  });
});
