import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

export type AuthMode = 'cookie' | 'bearer';

/** The origin of Strapi. Better Auth adds `/api/auth`, the path the end-users plugin serves it on. */
export const STRAPI_URL = import.meta.env.VITE_STRAPI_URL ?? 'http://localhost:1337';

const MODE_PARAM = 'mode';
const MODE_KEY = 'end-users.auth-mode';

/** Where Bearer mode keeps the token Strapi returned. Any script on the page can read it. */
export const TOKEN_KEY = 'end-users.bearer-token';

const isMode = (value: unknown): value is AuthMode => value === 'cookie' || value === 'bearer';

const readStorage = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key);
  } catch {
    return null; // storage can be unavailable (private mode, blocked site data)
  }
};

const writeStorage = (storage: Storage, key: string, value: string | null) => {
  try {
    if (value === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch {
    // nothing to do: the mode then lasts for this page load only
  }
};

/**
 * `?mode=cookie|bearer` on the address wins and is remembered for this tab (a full page load drops
 * the query string, and the client is built once per load), then `VITE_AUTH_MODE`, then `cookie`.
 */
const resolveMode = (): AuthMode => {
  const fromQuery = new URLSearchParams(window.location.search).get(MODE_PARAM);

  if (isMode(fromQuery)) {
    writeStorage(window.sessionStorage, MODE_KEY, fromQuery);

    return fromQuery;
  }

  const remembered = readStorage(window.sessionStorage, MODE_KEY);

  if (isMode(remembered)) {
    return remembered;
  }

  return isMode(import.meta.env.VITE_AUTH_MODE) ? import.meta.env.VITE_AUTH_MODE : 'cookie';
};

export const AUTH_MODE = resolveMode();

// Plain `createAuthClient` is the cookie client: it already sends `credentials: 'include'`, so the
// browser stores Strapi's session cookie and sends it back. Strapi allows this origin through CORS
// (`strapi::cors`) and Better Auth (`trustedOrigins`), and sets `SameSite=None; Secure`
// (`cookies.crossSite`), see examples/end-users/config.
const cookieClient = () =>
  createAuthClient({
    baseURL: STRAPI_URL,
    plugins: [twoFactorClient()],
  });

// The Bearer client sends no cookie at all. Strapi answers a sign-in or sign-up with the session
// token in a `set-auth-token` header: the client keeps it and sends it back as
// `Authorization: Bearer <token>` on every request. The page can only read that header because
// Better Auth's bearer plugin lists it in `Access-Control-Expose-Headers`, which the end-users
// plugin merges with what `strapi::cors` set. `Authorization` passes the preflight because
// `strapi::cors` allows it by default.
const bearerClient = () =>
  createAuthClient({
    baseURL: STRAPI_URL,
    plugins: [twoFactorClient()],
    fetchOptions: {
      credentials: 'omit',
      auth: { type: 'Bearer', token: () => readStorage(window.localStorage, TOKEN_KEY) ?? '' },
      onSuccess: (context) => {
        const token = context.response.headers.get('set-auth-token');

        if (token) {
          writeStorage(window.localStorage, TOKEN_KEY, token);
        }

        // Strapi has no way to tell the page to forget the token: signing out is the app's job
        if (context.request.url.toString().endsWith('/sign-out')) {
          writeStorage(window.localStorage, TOKEN_KEY, null);
        }
      },
    },
  });

export const authClient = AUTH_MODE === 'bearer' ? bearerClient() : cookieClient();
