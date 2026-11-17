import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The username of a compat registration, from the route that reads it to the user create that
 * stores it.
 *
 * The native sign-up refuses usernames users-permissions allowed (`jo`, `john-doe`), so the route
 * keeps it out of the engine's sign-up body. A before-create database hook of the compat plugin
 * adds it to the user's create data instead, so the user is written with its username and never
 * exists without it.
 *
 * It is an `AsyncLocalStorage` context entered only around the route's own sign-up call and private
 * to this module: nothing in a request reaches it, and it ends with the call it wraps.
 */
const pending = new AsyncLocalStorage<{ username: string }>();

/** Runs `callback`, and everything it awaits, with `username` for the user it creates. */
export const withPendingUsername = <T>(username: string, callback: () => Promise<T>): Promise<T> =>
  pending.run({ username }, callback);

export const pendingUsername = (): string | undefined => pending.getStore()?.username;
