import { authClient, STRAPI_URL } from '@/lib/auth-client';

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Sent as JSON. */
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

/** What a failed answer from Strapi says: `{ data: null, error: { status, name, message } }`. */
const describe = (error: { status: number; statusText: string; error?: unknown }) => {
  const { message } = (error.error ?? {}) as { message?: string };

  return message || error.statusText || `The request failed (${error.status})`;
};

/**
 * Calls Strapi's Content API (`/api/...`) as whoever is signed in, and returns the JSON it answers
 * with. It goes through the Better Auth client's own fetch, so it is sent the way the sign-in was:
 * with the session cookie in cookie mode, with `Authorization: Bearer <token>` (and no cookie) in
 * Bearer mode, and with neither when nobody is signed in, which Strapi answers as the Public role.
 * See `auth-client.ts`.
 *
 * A failed answer throws an `Error` with Strapi's message.
 */
export const strapi = async <T>(path: string, { method, body, query }: Options = {}) => {
  const { data, error } = await authClient.$fetch<T>(`${STRAPI_URL}${path}`, {
    method,
    body,
    query,
  });

  if (error) {
    throw new Error(describe(error));
  }

  return data;
};
