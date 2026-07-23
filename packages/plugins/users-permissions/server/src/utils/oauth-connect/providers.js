'use strict';

/**
 * OAuth endpoint definitions for built-in users-permissions providers.
 * Derived from grant's oauth.json (MIT) — inlined to drop the grant dependency.
 */
module.exports = {
  discord: {
    oauth: 2,
    authorize_url: 'https://discord.com/api/oauth2/authorize',
    access_url: 'https://discord.com/api/oauth2/token',
    scope_delimiter: ' ',
  },
  facebook: {
    oauth: 2,
    authorize_url: 'https://www.facebook.com/dialog/oauth',
    access_url: 'https://graph.facebook.com/oauth/access_token',
  },
  google: {
    oauth: 2,
    authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    access_url: 'https://oauth2.googleapis.com/token',
    scope_delimiter: ' ',
  },
  github: {
    oauth: 2,
    authorize_url: 'https://github.com/login/oauth/authorize',
    access_url: 'https://github.com/login/oauth/access_token',
  },
  microsoft: {
    oauth: 2,
    authorize_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    access_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope_delimiter: ' ',
  },
  twitter: {
    oauth: 1,
    request_url: 'https://api.twitter.com/oauth/request_token',
    authorize_url: 'https://api.twitter.com/oauth/authenticate',
    access_url: 'https://api.twitter.com/oauth/access_token',
  },
  instagram: {
    oauth: 2,
    authorize_url: 'https://api.instagram.com/oauth/authorize',
    access_url: 'https://api.instagram.com/oauth/access_token',
    scope_delimiter: ' ',
  },
  vk: {
    oauth: 2,
    authorize_url: 'https://oauth.vk.com/authorize',
    access_url: 'https://oauth.vk.com/access_token',
  },
  twitch: {
    oauth: 2,
    authorize_url: 'https://id.twitch.tv/oauth2/authorize',
    access_url: 'https://id.twitch.tv/oauth2/token',
    scope_delimiter: ' ',
  },
  linkedin: {
    oauth: 2,
    authorize_url: 'https://www.linkedin.com/oauth/v2/authorization',
    access_url: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope_delimiter: ' ',
  },
  cognito: {
    oauth: 2,
    authorize_url: 'https://[subdomain]/oauth2/authorize',
    access_url: 'https://[subdomain]/oauth2/token',
    scope_delimiter: ' ',
  },
  reddit: {
    oauth: 2,
    authorize_url: 'https://ssl.reddit.com/api/v1/authorize',
    access_url: 'https://ssl.reddit.com/api/v1/access_token',
    token_endpoint_auth_method: 'client_secret_basic',
  },
  auth0: {
    oauth: 2,
    authorize_url: 'https://[subdomain].auth0.com/authorize',
    access_url: 'https://[subdomain].auth0.com/oauth/token',
    scope_delimiter: ' ',
  },
  cas: {
    oauth: 2,
    authorize_url: 'https://[subdomain]/oidc/authorize',
    access_url: 'https://[subdomain]/oidc/token',
  },
  patreon: {
    oauth: 2,
    authorize_url: 'https://www.patreon.com/oauth2/authorize',
    access_url: 'https://www.patreon.com/api/oauth2/token',
    scope_delimiter: ' ',
  },
  keycloak: {
    oauth: 2,
    authorize_url: 'https://[subdomain]/protocol/openid-connect/auth',
    access_url: 'https://[subdomain]/protocol/openid-connect/token',
    scope_delimiter: ' ',
  },
};
