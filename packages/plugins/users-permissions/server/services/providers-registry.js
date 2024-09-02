'use strict';

const { strict: assert } = require('assert');
const jwt = require('jsonwebtoken');
const urljoin = require('url-join');
const jwkToPem = require('jwk-to-pem');

const getCognitoPayload = async ({ idToken, jwksUrl, purest }) => {
  const {
    header: { kid },
    payload,
  } = jwt.decode(idToken, { complete: true });

  if (!payload || !kid) {
    throw new Error('The provided token is not valid');
  }

  const config = {
    cognito: {
      discovery: {
        origin: jwksUrl.origin,
        path: jwksUrl.pathname,
      },
    },
  };
  try {
    const cognito = purest({ provider: 'cognito', config });
    // get the JSON Web Key (JWK) for the user pool
    const { body: jwk } = await cognito('discovery').request();
    // Get the key with the same Key ID as the provided token
    const key = jwk.keys.find(({ kid: jwkKid }) => jwkKid === kid);
    const pem = jwkToPem(key);

    // https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
    const decodedToken = await new Promise((resolve, reject) => {
      jwt.verify(idToken, pem, { algorithms: ['RS256'] }, (err, decodedToken) => {
        if (err) {
          reject();
        }
        resolve(decodedToken);
      });
    });
    return decodedToken;
  } catch (err) {
    throw new Error('There was an error verifying the token');
  }
};

const initProviders = ({ baseURL, purest }) => ({
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
      const discord = purest({ provider: 'discord' });

      return discord
        .get('users/@me')
        .auth(accessToken)
        .request()
        .then(({ body }) => {
          // Combine username and discriminator (if discriminator exists and not equal to 0)
          const username =
            body.discriminator && body.discriminator !== '0'
              ? `${body.username}#${body.discriminator}`
              : body.username;
          return {
            username,
            email: body.email,
          };
        });
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
      const facebook = purest({ provider: 'facebook' });

      return facebook
        .get('me')
        .auth(accessToken)
        .qs({ fields: 'name,email' })
        .request()
        .then(({ body }) => ({
          username: body.name,
          email: body.email,
        }));
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
      const google = purest({ provider: 'google' });

      return google
        .query('oauth')
        .get('tokeninfo')
        .qs({ accessToken })
        .request()
        .then(({ body }) => ({
          username: body.email.split('@')[0],
          email: body.email,
        }));
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
      const github = purest({
        provider: 'github',
        defaults: {
          headers: {
            'user-agent': 'strapi',
          },
        },
      });

      const { body: userBody } = await github.get('user').auth(accessToken).request();

      // This is the public email on the github profile
      if (userBody.email) {
        return {
          username: userBody.login,
          email: userBody.email,
        };
      }
      // Get the email with Github's user/emails API
      const { body: emailBody } = await github.get('user/emails').auth(accessToken).request();

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
      const microsoft = purest({ provider: 'microsoft' });

      return microsoft
        .get('me')
        .auth(accessToken)
        .request()
        .then(({ body }) => ({
          username: body.userPrincipalName,
          email: body.userPrincipalName,
        }));
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
      const twitter = purest({
        provider: 'twitter',
        defaults: {
          oauth: {
            consumer_key: providers.twitter.key,
            consumer_secret: providers.twitter.secret,
          },
        },
      });

      return twitter
        .get('account/verify_credentials')
        .auth(accessToken, query.access_secret)
        .qs({ screen_name: query['raw[screen_name]'], include_email: 'true' })
        .request()
        .then(({ body }) => ({
          username: body.screen_name,
          email: body.email,
        }));
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
      const instagram = purest({ provider: 'instagram' });

      return instagram
        .get('me')
        .auth(accessToken)
        .qs({ fields: 'id,username' })
        .request()
        .then(({ body }) => ({
          username: body.username,
          email: `${body.username}@strapi.io`, // dummy email as Instagram does not provide user email
        }));
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
      const vk = purest({ provider: 'vk' });

      return vk
        .get('users')
        .auth(accessToken)
        .qs({ id: query.raw.user_id, v: '5.122' })
        .request()
        .then(({ body }) => ({
          username: `${body.response[0].last_name} ${body.response[0].first_name}`,
          email: query.raw.email,
        }));
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
      const twitch = purest({
        provider: 'twitch',
        config: {
          twitch: {
            default: {
              origin: 'https://api.twitch.tv',
              path: 'helix/{path}',
              headers: {
                Authorization: 'Bearer {auth}',
                'Client-Id': '{auth}',
              },
            },
          },
        },
      });

      return twitch
        .get('users')
        .auth(accessToken, providers.twitch.key)
        .request()
        .then(({ body }) => ({
          username: body.data[0].login,
          email: body.data[0].email,
        }));
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
      const linkedIn = purest({ provider: 'linkedin' });
      const {
        body: { localizedFirstName },
      } = await linkedIn.get('me').auth(accessToken).request();
      const {
        body: { elements },
      } = await linkedIn
        .get('emailAddress?q=members&projection=(elements*(handle~))')
        .auth(accessToken)
        .request();

      const email = elements[0]['handle~'];

      return {
        username: localizedFirstName,
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
      const tokenPayload = await getCognitoPayload({ idToken, jwksUrl, purest });
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
      const reddit = purest({
        provider: 'reddit',
        config: {
          reddit: {
            default: {
              origin: 'https://oauth.reddit.com',
              path: 'api/{version}/{path}',
              version: 'v1',
              headers: {
                Authorization: 'Bearer {auth}',
                'user-agent': 'strapi',
              },
            },
          },
        },
      });

      return reddit
        .get('me')
        .auth(accessToken)
        .request()
        .then(({ body }) => ({
          username: body.name,
          email: `${body.name}@strapi.io`, // dummy email as Reddit does not provide user email
        }));
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
      const auth0 = purest({ provider: 'auth0' });

      return auth0
        .get('userinfo')
        .subdomain(providers.auth0.subdomain)
        .auth(accessToken)
        .request()
        .then(({ body }) => {
          const username = body.username || body.nickname || body.name || body.email.split('@')[0];
          const email = body.email || `${username.replace(/\s+/g, '.')}@strapi.io`;

          return {
            username,
            email,
          };
        });
    },
  },

  cas: {
    enabled: false,
    icon: 'book',
    grantConfig: {
      key: '',
      secret: '',
      callback: `${baseURL}/cas/callback`,
      scope: ['openid email'], // scopes should be space delimited
      subdomain: 'my.subdomain.com/cas',
    },
    async authCallback({ accessToken, providers }) {
      const cas = purest({ provider: 'cas' });

      return cas
        .get('oidc/profile')
        .subdomain(providers.cas.subdomain)
        .auth(accessToken)
        .request()
        .then(({ body }) => {
          // CAS attribute may be in body.attributes or "FLAT", depending on CAS config
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
        });
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
      const patreon = purest({
        provider: 'patreon',
        config: {
          patreon: {
            default: {
              origin: 'https://www.patreon.com',
              path: 'api/oauth2/{path}',
              headers: {
                authorization: 'Bearer {auth}',
              },
            },
          },
        },
      });

      return patreon
        .get('v2/identity')
        .auth(accessToken)
        .qs(new URLSearchParams({ 'fields[user]': 'full_name,email' }).toString())
        .request()
        .then(({ body }) => {
          const patreonData = body.data.attributes;
          return {
            username: patreonData.full_name,
            email: patreonData.email,
          };
        });
    },
  },
  keycloack: {
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
      const keycloak = purest({ provider: 'keycloak' });

      return keycloak
        .subdomain(providers.keycloak.subdomain)
        .get('protocol/openid-connect/userinfo')
        .auth(accessToken)
        .request()
        .then(({ body }) => {
          return {
            username: body.preferred_username,
            email: body.email,
          };
        });
    },
  },
});

module.exports = () => {
  const purest = require('purest');

  const apiPrefix = strapi.config.get('api.rest.prefix');
  const baseURL = urljoin(strapi.config.server.url, apiPrefix, 'auth');

  const authProviders = initProviders({ baseURL, purest });

  /**
   * @public
   */
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

    /**
     * @internal
     */
    async run({ provider, accessToken, query, providers }) {
      const authProvider = authProviders[provider];

      assert(authProvider, 'Unknown auth provider');

      return authProvider.authCallback({ accessToken, query, providers, purest });
    },
  };
};
