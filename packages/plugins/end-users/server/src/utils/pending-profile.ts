import type { Core } from '@strapi/types';

/**
 * The profile fields a sign-up carries, from the request that made it to the user create that
 * makes the profile.
 *
 * `strapi-profile` (a Better Auth hook) validates what the sign-up sent and leaves it here, on the
 * request's own state; `create-profile` (a Document Service middleware, in the same request and the
 * same database transaction as the user) writes it with the profile it makes. The two cannot call
 * each other: the hook lives behind the engine boundary and the middleware is Strapi's.
 *
 * It is the request's state and not something module-wide, so two sign-ups at once never see each
 * other's fields, and it is gone when the request is.
 */
export interface PendingProfile {
  fields: Record<string, unknown>;
}

const KEY = 'endUsersPendingProfile';

type RequestState = Record<string, unknown>;

const requestState = (strapi: Core.Strapi): RequestState | undefined =>
  strapi.requestContext?.get?.()?.state as RequestState | undefined;

/** Whether there is a request to leave it on. A sign-up always has one. */
export const hasRequestState = (strapi: Core.Strapi): boolean => requestState(strapi) !== undefined;

export const setPendingProfile = (strapi: Core.Strapi, pending: PendingProfile): void => {
  const state = requestState(strapi);

  if (state) {
    state[KEY] = pending;
  }
};

/** Reads it and clears it: the first user create of the request takes it, and no other does. */
export const takePendingProfile = (strapi: Core.Strapi): PendingProfile | undefined => {
  const state = requestState(strapi);
  const pending = state?.[KEY] as PendingProfile | undefined;

  if (state && pending) {
    delete state[KEY];
  }

  return pending;
};
