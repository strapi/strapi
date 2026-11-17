import type { Core } from '@strapi/types';

/**
 * What the identity provider sent about the user in this request: the provider's id and its raw
 * profile (the claims). It is left by the provider wrapper's `mapProfileToUser`, which Better Auth
 * calls with the profile while it reads the user from the provider, and read by the two writers of
 * profile mappings: `create-profile` for the sign-up mappings (in the user's own create) and
 * `provider-profile` for the every-sign-in ones (once the session exists).
 *
 * Like `pending-profile`, it is the request's own state: two sign-ins at once never see each other's
 * claims, and it is gone with the request.
 */
export interface ProviderClaims {
  providerId: string;
  profile: unknown;
}

const KEY = 'endUsersProviderClaims';

type RequestState = Record<string, unknown>;

const requestState = (strapi: Core.Strapi): RequestState | undefined =>
  strapi.requestContext?.get?.()?.state as RequestState | undefined;

export const setProviderClaims = (strapi: Core.Strapi, claims: ProviderClaims): void => {
  const state = requestState(strapi);

  if (state) {
    state[KEY] = claims;
  }
};

export const readProviderClaims = (strapi: Core.Strapi): ProviderClaims | undefined =>
  requestState(strapi)?.[KEY] as ProviderClaims | undefined;
