import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Marks the profile creates and deletes that the plugin itself makes with a user's own create or
 * delete (`create-profile`, `cascade-user-delete`) and at start (the profiles of users who have
 * none), so `one-profile-per-user` lets them through and refuses every other one.
 *
 * It is an `AsyncLocalStorage` context that is entered only around those calls, and its store is
 * private to this module. A request cannot set it: nothing in a request body, header or query
 * reaches it, and it ends with the call it wraps, so it never leaks into the next one.
 */
const lifecycle = new AsyncLocalStorage<true>();

/** Runs `callback`, and everything it awaits, as the plugin's own profile create or delete. */
export const asProfileLifecycle = <T>(callback: () => Promise<T>): Promise<T> =>
  lifecycle.run(true, callback);

export const inProfileLifecycle = (): boolean => lifecycle.getStore() === true;
