/**
 * The part of an undici dispatcher that `strapi.fetch` and its callers rely on: `dispatch` for
 * Node's fetch, `close` and `destroy` to shut it down.
 *
 * Typed structurally rather than from one undici version, because an app can hold undici 6, 7
 * or 8 (undici 6 is already at the root of a default app). The type accepts all three, but at
 * runtime Node 22 and 24's fetch only works with undici 6 and 7 agents directly: an undici 8
 * dispatcher must be wrapped in undici's `Dispatcher1Wrapper`, as @strapi/core does for the proxy.
 *
 * Typed for assigning: the value read back can be closed and destroyed, but handing it to a
 * specific undici (`request(url, { dispatcher })`, `setGlobalDispatcher`) needs a cast to that
 * undici's `Dispatcher`.
 */
export interface Dispatcher {
  dispatch(options: unknown, handler: unknown): boolean;
  close(): Promise<void>;
  destroy(): Promise<void>;
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
