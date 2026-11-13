import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { readCompatConfig } from '../compat/config';
import { isEndUsersStrategy } from '../strategies/end-users';
import type { EndUserCredentials } from '../strategies/end-users';

/** What the route policies read of a request: the result of its authentication */
export interface PolicyContext {
  state?: {
    auth?: { strategy?: { name?: unknown }; credentials?: unknown };
  };
}

/**
 * The end user the request was authenticated as, or a `PolicyError` of code
 * `AUTHENTICATION_REQUIRED`. Only this plugin's strategy authenticates an end user: a request on
 * the Public role has no credentials, and an API token is not a user. The refusals are
 * `PolicyError`s, as the strategy's are, so their message and code reach the client on a 403.
 */
export const signedInEndUser = (ctx: PolicyContext, strapi: Core.Strapi): EndUserCredentials => {
  const auth = ctx.state?.auth;
  const credentials = auth?.credentials as Partial<EndUserCredentials> | null | undefined;

  if (
    !isEndUsersStrategy(auth?.strategy?.name, readCompatConfig(strapi).usersPermissions) ||
    typeof credentials?.documentId !== 'string'
  ) {
    throw new errors.PolicyError('You need to sign in to do this.', {
      code: 'AUTHENTICATION_REQUIRED',
    });
  }

  return credentials as EndUserCredentials;
};
