'use strict';

const { strict: assert } = require('assert');
const jwt = require('jsonwebtoken');

const getInitialProviders = ({ purest }) => ({
  async discord({ accessToken }) {
    const discord = purest({ provider: 'discord' });
    return discord
      .get('users/@me')
      .auth(accessToken)
      .request()
      .then(({ body }) => {
        // Combine username and discriminator because discord username is not unique
        const username = `${body.username}#${body.discriminator}`;
        return {
          username,
          email: body.email,
        };
      });
  },
  async cognito({ query }) {
    // get the id_token
    const idToken = query.id_token;
    // decode the jwt token
    const tokenPayload = jwt.decode(idToken);
    if (!tokenPayload) {
      throw new Error('unable to decode jwt token');
    } else {
      return {
        username: tokenPayload['cognito:username'],
        email: tokenPayload.email,
      };
    }
  },
  async facebook({ accessToken }) {
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
  async google({ accessToken }) {
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
  async github({ accessToken }) {
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
  async microsoft({ accessToken }) {
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
  async twitter({ accessToken, query, providers }) {
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
  async instagram({ accessToken }) {
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
  async vk({ accessToken, query }) {
    const vk = purest({ provider: 'vk' });

    return vk
      .get('users.get')
      .auth(accessToken)
      .qs({ id: query.raw.user_id, v: '5.122' })
      .request()
      .then(({ body }) => ({
        username: `${body.response[0].last_name} ${body.response[0].first_name}`,
        email: query.raw.email,
      }));
  },
  async twitch({ accessToken, providers }) {
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
  async linkedin({ accessToken }) {
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
  async reddit({ accessToken }) {
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
  async auth0({ accessToken, providers }) {
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
  async cas({ accessToken, providers }) {
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
});

module.exports = () => {
  const purest = require('purest');

  const providersCallbacks = getInitialProviders({ purest });

  return {
    register(providerName, provider) {
      assert(typeof providerName === 'string', 'Provider name must be a string');
      assert(typeof provider === 'function', 'Provider callback must be a function');

      providersCallbacks[providerName] = provider({ purest });
    },

    async run({ provider, accessToken, query, providers }) {
      if (!providersCallbacks[provider]) {
        throw new Error('Unknown provider.');
      }

      const providerCb = providersCallbacks[provider];

      return providerCb({ accessToken, query, providers });
    },
  };
};
