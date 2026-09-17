import { CHANNEL_HEADER, DEFAULT_CHANNEL_SLUG } from '../constants';
import { getCurrentChannelSlug, setCurrentChannelSlug } from './currentChannel';

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

const isStaleChannelError = async (response: Response): Promise<boolean> => {
  if (response.status !== 400) {
    return false;
  }
  try {
    const body = await response.clone().json();
    return (
      typeof body?.error?.message === 'string' &&
      body.error.message.startsWith('Unknown or archived channel')
    );
  } catch {
    return false;
  }
};

/**
 * Stamps the active channel slug onto every request to the Strapi backend as
 * the `X-Strapi-Channel` header — always explicit, `default` included:
 * headerless requests resolve to the flagged default channel server-side, and
 * the admin must show exactly what it names. Wraps `window.fetch` like the
 * Spaces and Branches plugins do — the admin's fetch client exposes no
 * interceptor API. Idempotent through a symbol marker; chains cleanly on top
 * of other patches.
 *
 * Self-heal: a 400 naming an unknown/archived channel means the stored slug
 * went stale in a way the pickers could not catch (channel deleted elsewhere,
 * or a screen crashed before the heal effect mounted) — reset to the base
 * channel and replay the request once.
 */
export const installChannelHeaderInterceptor = () => {
  const w = window as any;

  if (typeof w.fetch !== 'function' || w.fetch[PATCHED]) {
    return;
  }

  const originalFetch = w.fetch.bind(window);

  const patched = (input: RequestInfo | URL, init?: RequestInit) => {
    const slug = getCurrentChannelSlug();

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

      let stamped: Promise<Response>;
      if (input instanceof Request && init === undefined) {
        const headers = new Headers(input.headers);
        headers.set(CHANNEL_HEADER, slug);
        stamped = originalFetch(new Request(input, { headers }));
      } else {
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined)
        );
        headers.set(CHANNEL_HEADER, slug);
        stamped = originalFetch(input, { ...init, headers });
      }

      if (slug === DEFAULT_CHANNEL_SLUG) {
        return stamped;
      }

      return stamped.then(async (response: Response) => {
        if (await isStaleChannelError(response)) {
          setCurrentChannelSlug(DEFAULT_CHANNEL_SLUG);
          return originalFetch(input, init);
        }
        return response;
      });
    } catch {
      return originalFetch(input, init);
    }
  };

  patched[PATCHED] = true;
  w.fetch = patched;
};
