'use strict';

const compact = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, compact(entry)])
      .filter(([, entry]) => entry !== undefined)
  );
};

/**
 * Compact grant's OAuth token response before it is written to the signed
 * koa-session cookie. The full token exchange payload (especially Cognito's
 * dual JWTs plus a duplicated raw blob) can exceed the browser's ~4 KB
 * per-cookie limit and silently break the auth callback.
 *
 * Keep only fields that auth.callback / providers-registry actually read.
 */
const trimGrantSessionResponse = (grantResponse, provider) => {
  if (!grantResponse || typeof grantResponse !== 'object') {
    return grantResponse;
  }

  switch (provider) {
    case 'cognito':
      return compact({
        id_token: grantResponse.id_token,
      });

    case 'twitter':
      return compact({
        access_token: grantResponse.access_token,
        access_secret: grantResponse.access_secret,
        raw: grantResponse.raw?.screen_name
          ? { screen_name: grantResponse.raw.screen_name }
          : undefined,
      });

    case 'vk':
      return compact({
        access_token: grantResponse.access_token,
        raw:
          grantResponse.raw?.email != null && grantResponse.raw?.user_id != null
            ? {
                email: grantResponse.raw.email,
                user_id: grantResponse.raw.user_id,
              }
            : undefined,
      });

    default:
      return compact({
        access_token: grantResponse.access_token,
        oauth_token: grantResponse.oauth_token,
        id_token: grantResponse.id_token,
      });
  }
};

module.exports = {
  trimGrantSessionResponse,
};
