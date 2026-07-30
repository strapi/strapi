import { getCurrentSpaceSlug } from './currentSpace';

const PATCHED = Symbol.for('@strapi/plugin-spaces/fetch-patched');
const SPACE_HEADER = 'X-Strapi-Space-Id';

/**
 * ONLY `/spaces/mine` is exempt from the workspace header: it's what lets the
 * SpaceSwitcher self-heal when the stored slug has gone stale (space archived,
 * DB reset) instead of every request 400ing with no way out. Every other
 * `/spaces/*` route carries the header so the server knows the ACTIVE
 * workspace: management routes are default-workspace-only, and `/spaces/move`
 * is gated by the source workspace's `moveEntries` capability.
 */
const isUnscopedPath = (path: string) => path.startsWith('/spaces/mine');

/**
 * Stamps the active workspace slug onto every request to the Strapi backend as
 * the `X-Strapi-Space-Id` header, which `resolve-space` on the server turns
 * into `ctx.state.spaceId` / `ctx.state.spaceSlug`.
 *
 * The admin's fetch client (`getFetchClient`) calls the global `fetch` directly
 * and exposes no request-interceptor API, so this wraps `window.fetch` — scoped
 * to backend URLs only and idempotent via a symbol marker.
 */
export const installSpaceHeaderInterceptor = () => {
  const w = window as any;

  if (typeof w.fetch !== 'function' || w.fetch[PATCHED]) {
    return;
  }

  const originalFetch = w.fetch.bind(window);

  const patched = (input: RequestInfo | URL, init?: RequestInit) => {
    const slug = getCurrentSpaceSlug();

    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const backendURL: string = w.strapi?.backendURL ?? '';
      const isBackendRequest =
        url.startsWith('/') || (backendURL !== '' && url.startsWith(backendURL));

      if (!isBackendRequest) {
        return originalFetch(input, init);
      }

      const path =
        backendURL !== '' && url.startsWith(backendURL) ? url.slice(backendURL.length) : url;
      if (isUnscopedPath(path)) {
        return originalFetch(input, init);
      }

      if (input instanceof Request && init === undefined) {
        const headers = new Headers(input.headers);
        headers.set(SPACE_HEADER, slug);
        return originalFetch(new Request(input, { headers }));
      }

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      headers.set(SPACE_HEADER, slug);
      return originalFetch(input, { ...init, headers });
    } catch {
      // Never let header decoration break a request the app depends on.
      return originalFetch(input, init);
    }
  };

  patched[PATCHED] = true;
  w.fetch = patched;
};
