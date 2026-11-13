/**
 * The part of an undici dispatcher that `strapi.fetch` relies on.
 *
 * Typed structurally rather than from one undici version: an app can hold undici 6, 7 or 8
 * (undici 6 is already at the root of a default app), and Node's fetch accepts their agents.
 */
export interface Dispatcher {
  dispatch(options: unknown, handler: unknown): boolean;
}

/**
 * strapi.fetch interface is currently an identical wrapper for Node fetch()
 * See createStrapiFetch in strapi/utils
 * However, we want to retain the ability to extend it in the future.
 * */

export interface Fetch {
  (input: string | URL | Request, init?: RequestInit | undefined): Promise<Response>;
  dispatcher?: Dispatcher;
}
