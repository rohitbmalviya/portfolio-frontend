// ============================================================
//  lib/utils.ts — Small utility helpers
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to "Mon YYYY".
 * Accepts YYYY-MM-DD strings and full ISO datetime strings (e.g. from the backend).
 * Returns the raw string unchanged for empty / unrecognised values.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format an ISO date string for blog posts. */
export function formatBlogDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Truncate a string to maxLen characters, appending "…". */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + '…';
}

/** Group an array by a key. */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

/** Format reading time from minutes. */
export function readingTimeLabel(minutes: number | null | undefined): string {
  if (!minutes) return '';
  return `${minutes} min read`;
}
