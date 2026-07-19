// @vitest-environment jsdom
//
// This suite needs `window`/`window.location` (the module branches on
// `typeof window !== 'undefined'` before redirecting), so it opts into the
// jsdom environment via the docblock above — every other test file in this
// project stays on the fast default `node` environment (see vitest.config.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('adminFetch (via admin-api.ts) — 401 refresh/retry/redirect flow', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Stub location.href so jsdom's "not implemented: navigation" console
    // noise never fires, and so we can assert on the redirect target.
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function jsonResponse(status: number, body: unknown): Response {
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    } as unknown as Response;
  }

  it('on a single 401, refreshes once and retries the original request, returning the retried data', async () => {
    const { adminPages } = await import('./admin-api');

    fetchMock
      // 1. Original request → 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      // 2. POST /backend-api/auth/refresh → 200 (refreshed)
      .mockResolvedValueOnce(jsonResponse(200, {}))
      // 3. Retried original request → 200 with data
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: 'p1', slug: 'home' }] }));

    const result = await adminPages.list();

    expect(result).toEqual([{ id: 'p1', slug: 'home' }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/backend-api/auth/refresh');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(window.location.href).toBe(''); // no redirect on success
  });

  it('redirects to /admin/login and throws when the refresh call itself fails', async () => {
    const { adminPages } = await import('./admin-api');

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {})) // original request → 401
      .mockResolvedValueOnce(jsonResponse(401, {})); // refresh → still 401 (failed)

    await expect(adminPages.list()).rejects.toThrow('Unauthorized');

    expect(fetchMock).toHaveBeenCalledTimes(2); // no retry attempted — refresh failed
    expect(window.location.href).toBe('/admin/login');
  });

  it('redirects to /admin/login when refresh succeeds but the retried request still 401s', async () => {
    const { adminPages } = await import('./admin-api');

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {})) // original request → 401
      .mockResolvedValueOnce(jsonResponse(200, {})) // refresh → succeeds
      .mockResolvedValueOnce(jsonResponse(401, {})); // retried request → 401 again

    await expect(adminPages.list()).rejects.toThrow('Unauthorized');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(window.location.href).toBe('/admin/login');
  });

  it('never attempts a refresh for the auth/refresh, auth/login, or auth/logout endpoints themselves', async () => {
    const { adminAuth } = await import('./admin-api');

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid email or password.' }));

    // Every 401 response — including on auth endpoints — is normalised by
    // adminFetch to `throw new Error('Unauthorized')` after redirecting;
    // the parsed backend message is only used for non-401 error statuses.
    await expect(adminAuth.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      'Unauthorized',
    );

    // Only the single login call — no refresh attempt, no retry.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/admin/login');
  });

  it('shares a single in-flight refresh across concurrent 401s (no refresh stampede)', async () => {
    const { adminPages, adminStats } = await import('./admin-api');

    let resolveRefresh!: (res: Response) => void;
    const refreshPending = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });

    const callCountFor = (url: string): number =>
      fetchMock.mock.calls.filter((call: unknown[]) => String(call[0]) === url).length;

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/backend-api/auth/refresh') {
        return refreshPending;
      }
      if (url === '/backend-api/pages?admin=true') {
        // First call for this endpoint → 401; second (post-refresh retry) → success
        const calls = callCountFor('/backend-api/pages?admin=true');
        return Promise.resolve(
          calls <= 1 ? jsonResponse(401, {}) : jsonResponse(200, { data: [{ id: 'p1' }] }),
        );
      }
      if (url === '/backend-api/stats') {
        const calls = callCountFor('/backend-api/stats');
        return Promise.resolve(
          calls <= 1 ? jsonResponse(401, {}) : jsonResponse(200, { data: { pages: 1 } }),
        );
      }
      throw new Error(`Unexpected fetch call to ${url}`);
    });

    // Fire two concurrent admin calls that will both 401 first.
    const p1 = adminPages.list();
    const p2 = adminStats.get();

    // Let both initial requests reject with 401 and kick off the shared refresh.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Exactly one refresh call should be in flight at this point.
    expect(callCountFor('/backend-api/auth/refresh')).toBe(1);

    resolveRefresh(jsonResponse(200, {}));

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual([{ id: 'p1' }]);
    expect(r2).toEqual({ pages: 1 });

    expect(callCountFor('/backend-api/auth/refresh')).toBe(1); // still just one — never a stampede
  });
});
