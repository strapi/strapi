import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The device a compat sign-in names, from the route that reads it to the session create that
 * stores it. A before-create database hook of the compat plugin reads it, so the session is written
 * with its device and never exists without one. Same shape as `pending-username`: entered only
 * around the route's own sign-in call, private to this module, and it ends with the call it wraps.
 */
const pending = new AsyncLocalStorage<{ deviceId: string }>();

/** Runs `callback`, and everything it awaits, with `deviceId` for the session it creates. */
export const withPendingDevice = <T>(deviceId: string, callback: () => Promise<T>): Promise<T> =>
  pending.run({ deviceId }, callback);

export const pendingDevice = (): string | undefined => pending.getStore()?.deviceId;
