'use strict';

const { strict: assert } = require('assert');
const urljoin = require('url-join');

const { verifyJwtWithJwks } = require('../utils/verify-jwt-with-jwks');
const { bearerGet, fetchJson } = require('../utils/provider-http');

const initProviders = ({ baseURL }) => ({
  email: {
    enabled: true,
    icon: 'envelope',
    grantConfig: {},
  },
  discord: {
    enabled: false,
    icon: 'discord',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/discord/callback`,
      scope: ['identify', 'email'],
    },
    async authCallback({ accessToken }) {
      const { body } = await bearerGet('https://discord.com/api/users/@me', accessToken);
      const username =
        body.discriminator && body.discriminator !== '0'
          ? `${body.username}#${body.discriminator}`
          : body.username;
      return {
        username,
        email: body.email,
      };
    },
  },
  facebook: {
    enabled: false,
    icon: 'facebook-square',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/facebook/callback`,
      scope: ['email'],
    },
    async authCallback({ accessToken }) {
      const { body } = await bearerGet('https://graph.facebook.com/me', accessToken, {
        qs: { fields: 'name,email' },
      });
      return {
        username: body.name,
        email: body.email,
      };
    },
  },
  google: {
    enabled: false,
    icon: 'google',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/google/callback`,
      scope: ['email'],
    },
    async authCallback({ accessToken }) {
      const { body } = await fetchJson(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
      );
      return {
        username: body.email.split('@')[0],
        email: body.email,
      };
    },
  },
  github: {
    enabled: false,
    icon: 'github',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/github/callback`,
      scope: ['user', 'user:email'],
    },
    async authCallback({ accessToken }) {
      const { body: userBody } = await bearerGet('https://api.github.com/user', accessToken, {
        headers: { 'user-agent': 'strapi' },
      });

      if (userBody.email) {
        return {
          username: userBody.login,
          email: userBody.email,
        };
      }

      const { body: emailBody } = await bearerGet(
        'https://api.github.com/user/emails',
        accessToken,
        {
          headers: { 'user-agent': 'strapi' },
        }
      );

      return {
        username: userBody.login,
        email: Array.isArray(emailBody)
          ? emailBody.find((email) => email.primary === true).email
          : null,
      };
    },
  },
  microsoft: {
    enabled: false,
    icon: 'windows',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/microsoft/callback`,
      scope: ['user.read'],
    },
    async authCallback({ accessToken }) {
      const { body } = await bearerGet('https://graph.microsoft.com/v1.0/me', accessToken);
      return {
        username: body.userPrincipalName,
        email: body.userPrincipalName,
      };
    },
  },

  twitter: {
    enabled: false,
    icon: 'twitter',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/twitter/callback`,
    },
    async authCallback({ accessToken, query, providers }) {
      const { twitterGet } = require('../utils/oauth-connect/oauth1');
      const { body } = await twitterGet({
        url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
        accessToken,
        accessCredential: query.access_secret,
        consumerKey: providers.twitter.key,
        clientCredential: providers.twitter.secret,
        qs: { include_email: 'true', screen_name: query['raw[screen_name]'] },
      });

      return {
        username: body.screen_name,
        email: body.email,
      };
    },
  },
  instagram: {
    enabled: false,
    icon: 'instagram',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/instagram/callback`,
      scope: ['user_profile'],
    },
    async authCallback({ accessToken }) {
      const { body } = await bearerGet('https://graph.instagram.com/me', accessToken, {
        qs: { fields: 'id,username' },
      });
      return {
        username: body.username,
        email: `${body.username}@strapi.io`,
      };
    },
  },
  vk: {
    enabled: false,
    icon: 'vk',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/vk/callback`,
      scope: ['email'],
    },
    async authCallback({ accessToken, query }) {
      const { body } = await bearerGet('https://api.vk.com/method/users.get', accessToken, {
        qs: { user_ids: query.raw.user_id, v: '5.122' },
      });
      return {
        username: `${body.response[0].last_name} ${body.response[0].first_name}`,
        email: query.raw.email,
      };
    },
  },

  twitch: {
    enabled: false,
    icon: 'twitch',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/twitch/callback`,
      scope: ['user:read:email'],
    },
    async authCallback({ accessToken, providers }) {
      const { body } = await bearerGet('https://api.twitch.tv/helix/users', accessToken, {
        headers: {
          'Client-Id': providers.twitch.key,
        },
      });
      return {
        username: body.data[0].login,
        email: body.data[0].email,
      };
    },
  },

  linkedin: {
    enabled: false,
    icon: 'linkedin',
    grantConfig: {
      key: '',
      secret: '',
      callbackUrl: `${baseURL}/linkedin/callback`,
      scope: ['r_liteprofile', 'r_emailaddress'],
    },
    async authCallback({ accessToken }) {
      const { body: profileBody } = await bearerGet('https://api.linkedin.com/v2/me', accessToken);
      const { body: emailBody } = await bearerGet(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        accessToken
      );

      const email = emailBody.elements[0]['handle~'];

      return {
        username: profileBody.localizedFirstName,
        email: email.emailAddress,
      };
    },
  },

  cognito: {
    enabled: false,
    icon: 'aws',
    grantConfig: {
      key: '',
      secret: '',
      subdomain: 'my.subdomain.com',
      callback: `${baseURL}/cognito/callback`,
      scope: ['email', 'openid', 'profile'],
    },
    async authCallback({ query, providers }) {
      const jwksUrl = new URL(providers.cognito.jwksurl);
      const idToken = query.id_token;
      const tokenPayload = await verifyJwtWithJwks({ idToken, jwksUrl });
      return {
        username: tokenPayload['cognito:username'],
        email: tokenPayload.email,
      };
    },
  },

  reddit: {
    enabled: false,
    icon: 'reddit',
    grantConfig: {
      key: '',
      secret: '',
      callback: `${baseURL}/reddit/callback`,
      scope: ['identity'],
    },
    async authCallback({ accessToken }) {
      const { body } = await bearerGet('https://oauth.reddit.com/api/v1/me', accessToken, {
        headers: { 'user-agent': 'strapi' },
      });
      return {
        username: body.name,
        email: `${body.name}@strapi.io`,
      };
    },
  },

  auth0: {
    enabled: false,
    icon: '',
    grantConfig: {
      key: '',
      secret: '',
      subdomain: 'my-tenant.eu',
      callback: `${baseURL}/auth0/callback`,
      scope: ['openid', 'email', 'profile'],
    },
    async authCallback({ accessToken, providers }) {
      const { body } = await bearerGet(
        `https://${providers.auth0.subdomain}.auth0.com/userinfo`,
        accessToken
      );
      const username = body.username || body.nickname || body.name || body.email.split('@')[0];
      const email = body.email || `${username.replace(/\s+/g, '.')}@strapi.io`;

      return {
        username,
        email,
      };
    },
  },

  cas: {
    enabled: false,
    icon: 'book',
    grantConfig: {
      key: '',
      secret: '',
      callback: `${baseURL}/cas/callback`,
      scope: ['openid email'],
      subdomain: 'my.subdomain.com/cas',
    },
    async authCallback({ accessToken, providers }) {
      const { body } = await bearerGet(
        `https://${providers.cas.subdomain}/oidc/profile`,
        accessToken
      );
      const username = body.attributes
        ? body.attributes.strapiusername || body.id || body.sub
        : body.strapiusername || body.id || body.sub;
      const email = body.attributes
        ? body.attributes.strapiemail || body.attributes.email
        : body.strapiemail || body.email;
      if (!username || !email) {
        strapi.log.warn(
          `CAS Response Body did not contain required attributes: ${JSON.stringify(body)}`
        );
      }
      return {
        username,
        email,
      };
    },
  },

  patreon: {
    enabled: false,
    icon: '',
    grantConfig: {
      key: '',
      secret: '',
      callback: `${baseURL}/patreon/callback`,
      scope: ['identity', 'identity[email]'],
    },
    async authCallback({ accessToken }) {
      const { body } = await bearerGet(
        'https://www.patreon.com/api/oauth2/v2/identity?fields[user]=full_name,email',
        accessToken
      );
      const patreonData = body.data.attributes;
      return {
        username: patreonData.full_name,
        email: patreonData.email,
      };
    },
  },
  keycloak: {
    enabled: false,
    icon: '',
    grantConfig: {
      key: '',
      secret: '',
      subdomain: 'myKeycloakProvider.com/realms/myrealm',
      callback: `${baseURL}/keycloak/callback`,
      scope: ['openid', 'email', 'profile'],
    },
    async authCallback({ accessToken, providers }) {
      const { body } = await bearerGet(
        `https://${providers.keycloak.subdomain}/protocol/openid-connect/userinfo`,
        accessToken
      );
      return {
        username: body.preferred_username,
        email: body.email,
      };
    },
  },
});

module.exports = () => {
  const apiPrefix = strapi.config.get('api.rest.prefix');
  const baseURL = urljoin(strapi.config.server.url, apiPrefix, 'auth');

  const authProviders = initProviders({ baseURL });

  return {
    getAll() {
      return authProviders;
    },
    get(name) {
      return authProviders[name];
    },
    add(name, config) {
      authProviders[name] = config;
    },
    remove(name) {
      delete authProviders[name];
    },

    async run({ provider, accessToken, query, providers }) {
      const authProvider = authProviders[provider];

      assert(authProvider, 'Unknown auth provider');

      return authProvider.authCallback({ accessToken, query, providers });
    },
  };
};
