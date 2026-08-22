// ============================================================
//  POST /api/revalidate — on-demand cache invalidation.
//
//  Public pages are ISR-cached with a long window (see lib/api.ts).
//  This endpoint is what makes that safe: after an admin save,
//  lib/admin-api.ts calls it and the affected tags are dropped, so
//  the very next request re-renders against fresh data.
//
//  AUTH: no shared secret. A secret would have to reach the browser
//  (the admin is client-rendered) and would therefore be public. We
//  instead forward the caller's own cookies to the backend's
//  /auth/me — if the backend accepts them, the caller is the logged-in
//  admin. Reuses the existing httpOnly session; nothing new to leak.
//
//  Worst case if this were left open is a forced cache refresh, not
//  data exposure — but an unauthenticated endpoint that triggers
//  origin re-renders is a cheap DoS lever, hence the check.
// ============================================================

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { ALL_CACHE_TAGS, type CacheTag } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Verify the caller holds a valid admin session by asking the backend. */
async function isAdmin(cookie: string | null): Promise<boolean> {
  if (!cookie) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { cookie },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    // Backend unreachable — fail closed.
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin(request.headers.get('cookie')))) {
    return NextResponse.json({ revalidated: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Body is optional: `{ tags: [...] }` narrows the invalidation, and omitting
  // it clears everything. Callers that can't confidently map a mutation to
  // tags should omit it — over-invalidating costs one re-render, while
  // under-invalidating silently serves stale content.
  let tags: CacheTag[] = ALL_CACHE_TAGS;
  try {
    const body = (await request.json()) as { tags?: string[] } | null;
    if (body?.tags?.length) {
      const valid = body.tags.filter((t): t is CacheTag =>
        (ALL_CACHE_TAGS as string[]).includes(t),
      );
      if (valid.length) tags = valid;
    }
  } catch {
    // No body / not JSON — fall through to invalidating everything.
  }

  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ revalidated: true, tags });
}
