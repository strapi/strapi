import { CHANNEL_HEADER, DEFAULT_CHANNEL_SLUG } from '../constants';
import { getCurrentChannelSlug } from './currentChannel';

const PATCHED = Symbol.for('@strapi/plugin-channels/fetch-patched');

/**
 * Requests that must always act on the base content:
 *   - `/channels` lets the pickers self-heal when the stored slug is stale and
 *     keeps channel management channel-neutral;
 *   - Releases, the Media Library, the Content-Type Builder and the admin's
 *     own settings are not channel-aware.
 */
const isBaseOnlyPath = (path: string) =>
  path.startsWith('/channels') ||
  path.startsWith('/content-releases') ||
  path.startsWith('/upload') ||
  path.startsWith('/content-type-builder') ||
  path.startsWith('/admin/');

/**
 * Stamps the active channel slug onto every request to the Strapi backend as
 * the `X-Strapi-Channel` header (skipped on the base). Wraps `window.fetch`
 * like the Spaces and Branches plugins do — the admin's fetch client exposes
 * no interceptor API. Idempotent through a symbol marker; chains cleanly on
 * top of other patches.
 */
export const installChannelHeaderInterceptor = () => {
  const w = window as any;

  if (typeof w.fetch !== 'function' || w.fetch[PATCHED]) {
    return;
  }

  const originalFetch = w.fetch.bind(window);

  const patched = (input: RequestInfo | URL, init?: RequestInit) => {
    const slug = getCurrentChannelSlug();
    if (slug === DEFAULT_CHANNEL_SLUG) {
      return originalFetch(input, init);
    }

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
      if (isBaseOnlyPath(path)) {
        return originalFetch(input, init);
      }

      if (input instanceof Request && init === undefined) {
        const headers = new Headers(input.headers);
        headers.set(CHANNEL_HEADER, slug);
        return originalFetch(new Request(input, { headers }));
      }

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      headers.set(CHANNEL_HEADER, slug);
      return originalFetch(input, { ...init, headers });
    } catch {
      return originalFetch(input, init);
    }
  };

  patched[PATCHED] = true;
  w.fetch = patched;
};
