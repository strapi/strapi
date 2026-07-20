'use strict';

const { errors } = require('@strapi/utils');

const builtinProviderEndpoints = require('./providers');
const oauth1 = require('./oauth1');
const oauth2 = require('./oauth2');

const CONNECT_PREFIX = '/connect';

const parseConnectPath = (requestPath, apiPrefix) => {
  const prefix = `${apiPrefix}${CONNECT_PREFIX}/`;
  if (!requestPath.startsWith(prefix)) {
    return null;
  }

  const remainder = requestPath.slice(prefix.length);
  const [provider, segment] = remainder.split('/').filter(Boolean);

  if (!provider) {
    return null;
  }

  return {
    provider,
    isCallback: segment === 'callback',
  };
};

/**
 * Resolve OAuth endpoint config from built-ins, falling back to store-defined
 * endpoints so custom providers registered via providers-registry still work.
 */
const buildProviderConfig = (providerName, storedConfig, redirectUri) => {
  const defaults = builtinProviderEndpoints[providerName];
  const endpoints = defaults || {
    oauth: storedConfig.oauth,
    authorize_url: storedConfig.authorize_url,
    access_url: storedConfig.access_url,
    request_url: storedConfig.request_url,
    scope_delimiter: storedConfig.scope_delimiter,
    token_endpoint_auth_method: storedConfig.token_endpoint_auth_method,
  };

  if (endpoints.oauth === 1) {
    if (!endpoints.request_url || !endpoints.authorize_url || !endpoints.access_url) {
      return null;
    }
  } else if (!endpoints.authorize_url || !endpoints.access_url) {
    return null;
  }

  return {
    name: providerName,
    ...endpoints,
    key: storedConfig.key,
    secret: storedConfig.secret,
    scope: storedConfig.scope,
    subdomain: storedConfig.subdomain,
    callback: storedConfig.callback,
    redirect_uri: redirectUri,
  };
};

const redirectWithPayload = (ctx, callbackUrl, payload) => {
  const url = new URL(callbackUrl);
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'raw') {
      Object.entries(value).forEach(([rawKey, rawValue]) => {
        params.set(`raw[${rawKey}]`, String(rawValue));
      });
      return;
    }
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });

  url.search = params.toString();
  ctx.redirect(url.toString());
};

const preserveGrantDynamic = (ctx) => {
  const dynamic = ctx.session.grant?.dynamic;
  return dynamic ? { dynamic } : {};
};

const startOAuth1Flow = async (ctx, provider, parsed, redirectUri) => {
  const requestToken = await oauth1.requestToken({
    requestUrl: provider.request_url,
    redirectUri,
    consumerKey: provider.key,
    clientCredential: provider.secret,
  });

  ctx.session.grant = {
    ...preserveGrantDynamic(ctx),
    provider: parsed.provider,
    request: requestToken,
  };

  const authorizeUrl = `${provider.authorize_url}?oauth_token=${encodeURIComponent(requestToken.oauth_token)}`;
  return ctx.redirect(authorizeUrl);
};

const startOAuth2Flow = (ctx, provider, parsed, redirectUri) => {
  const state = oauth2.generateState();
  ctx.session.grant = {
    ...preserveGrantDynamic(ctx),
    provider: parsed.provider,
    state,
  };

  let authorizeUrl = oauth2.buildAuthorizeUrl(provider, {
    key: provider.key,
    redirectUri,
    scope: provider.scope,
    subdomain: provider.subdomain,
  });

  authorizeUrl += `&state=${encodeURIComponent(state)}`;
  return ctx.redirect(authorizeUrl);
};

const handleOAuth1Callback = async (ctx, provider, callbackUrl) => {
  const session = ctx.session.grant || {};
  const { oauth_token: oauthToken, oauth_verifier: oauthVerifier } = ctx.query;
  const requestToken = session.request;

  if (!requestToken?.oauth_token || oauthToken !== requestToken.oauth_token) {
    throw new Error('OAuth1 token mismatch');
  }

  const tokenResponse = await oauth1.accessToken({
    accessUrl: provider.access_url,
    consumerKey: provider.key,
    clientCredential: provider.secret,
    oauthToken,
    oauthVerifier,
    oauthTokenCredential: requestToken.oauth_token_secret,
  });

  const payload = oauth2.tokensToQueryPayload(provider, tokenResponse);
  ctx.session.grant = {};
  return redirectWithPayload(ctx, callbackUrl, payload);
};

const handleOAuth2Callback = async (ctx, provider, callbackUrl, redirectUri) => {
  const session = ctx.session.grant || {};
  const { code, state: queryState, error, error_description: errorDescription } = ctx.query;

  if (error) {
    ctx.session.grant = {};
    return redirectWithPayload(ctx, callbackUrl, {
      error,
      error_description: errorDescription,
    });
  }

  if (!code) {
    throw new Error('OAuth2 missing code parameter');
  }

  // Reject when session state is missing (not only on mismatch) to close login-CSRF.
  if (!session.state || queryState !== session.state) {
    throw new Error('OAuth2 state mismatch');
  }

  const tokenResponse = await oauth2.exchangeAuthorizationCode(provider, {
    key: provider.key,
    secret: provider.secret,
    redirectUri,
    code,
    subdomain: provider.subdomain,
  });

  const payload = oauth2.tokensToQueryPayload(provider, tokenResponse);
  ctx.session.grant = {};
  return redirectWithPayload(ctx, callbackUrl, payload);
};

const createOAuthConnectMiddleware = () => {
  return async (ctx, next) => {
    const apiPrefix = strapi.config.get('api.rest.prefix');
    const [requestPath] = ctx.request.url.split('?');
    const parsed = parseConnectPath(requestPath, apiPrefix);

    if (!parsed) {
      return next();
    }

    if (!ctx.session) {
      ctx.throw(400, 'OAuth connect requires session middleware');
    }

    const storedProviders = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get();

    const storedConfig = storedProviders?.[parsed.provider];
    if (!storedConfig?.enabled) {
      throw new errors.ApplicationError('This provider is disabled');
    }

    const { getService } = require('..');
    const redirectUri = getService('providers').buildRedirectUri(parsed.provider);

    const callbackOverride =
      ctx.state.oauthConnect?.callback ?? ctx.session.grant?.dynamic?.callback;
    const effectiveConfig = callbackOverride
      ? { ...storedConfig, callback: callbackOverride }
      : storedConfig;

    const provider = buildProviderConfig(parsed.provider, effectiveConfig, redirectUri);

    if (!provider) {
      throw new errors.ApplicationError('Unknown OAuth provider');
    }

    ctx.session.grant = ctx.session.grant || {};

    if (!parsed.isCallback) {
      if (provider.oauth === 1) {
        return startOAuth1Flow(ctx, provider, parsed, redirectUri);
      }
      return startOAuth2Flow(ctx, provider, parsed, redirectUri);
    }

    const callbackUrl = effectiveConfig.callback;
    if (!callbackUrl) {
      throw new errors.ApplicationError('Provider callback URL is not configured');
    }

    try {
      if (provider.oauth === 1) {
        return await handleOAuth1Callback(ctx, provider, callbackUrl);
      }
      return await handleOAuth2Callback(ctx, provider, callbackUrl, redirectUri);
    } catch (err) {
      ctx.session.grant = {};
      return redirectWithPayload(ctx, callbackUrl, {
        error: 'oauth_error',
        error_description: err.message,
      });
    }
  };
};

module.exports = {
  createOAuthConnectMiddleware,
  parseConnectPath,
  buildProviderConfig,
  redirectWithPayload,
};
