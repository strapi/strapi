'use strict';

const jwt = require('jsonwebtoken');
// Purest strategies.
const purest = require('purest');

module.exports = async ({ provider, access_token, query, providers }) => {
  switch (provider) {
    case 'discord': {
      const discord = purest({ provider: 'discord' });
      return discord
        .get('users/@me')
        .auth(access_token)
        .request()
        .then(({ body }) => {
          // Combine username and discriminator because discord username is not unique
          var username = `${body.username}#${body.discriminator}`;
          return {
            username,
            email: body.email,
          };
        });
    }
    case 'cognito': {
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
    }
    case 'facebook': {
      const facebook = purest({ provider: 'facebook' });

      return facebook
        .get('me')
        .auth(access_token)
        .qs({ fields: 'name,email' })
        .request()
        .then(({ body }) => ({
          username: body.name,
          email: body.email,
        }));
    }
    case 'google': {
      const google = purest({ provider: 'google' });

      return google
        .query('oauth')
        .get('tokeninfo')
        .qs({ access_token })
        .request()
        .then(({ body }) => ({
          username: body.email.split('@')[0],
          email: body.email,
        }));
    }
    case 'github': {
      const github = purest({
        provider: 'github',
        defaults: {
          headers: {
            'user-agent': 'strapi',
          },
        },
      });

      return github
        .get('user')
        .auth(access_token)
        .request()
        .then(({ body: userbody }) => {
          // This is the public email on the github profile
          if (userbody.email) {
            return {
              username: userbody.login,
              email: userbody.email,
            };
          }
          // Get the email with Github's user/emails API
          return github
            .get('user/emails')
            .auth(access_token)
            .request()
            .then(({ body: emailsbody }) => {
              return {
                username: userbody.login,
                email: Array.isArray(emailsbody)
                  ? emailsbody.find(email => email.primary === true).email
                  : null,
              };
            });
        });
    }
    case 'microsoft': {
      const microsoft = purest({ provider: 'microsoft' });

      return microsoft
        .get('me')
        .auth(access_token)
        .request()
        .then(({ body }) => ({
          username: body.userPrincipalName,
          email: body.userPrincipalName,
        }));
    }
    case 'twitter': {
      const twitter = purest({
        provider: 'twitter',
      });

      return twitter
        .get('account/verify_credentials')
        .auth(access_token, query.access_secret)
        .qs({ screen_name: query['raw[screen_name]'], include_email: 'true' })
        .request()
        .then(({ body }) => ({
          username: body.screen_name,
          email: body.email,
        }));
    }
    case 'instagram': {
      const instagram = purest({ provider: 'instagram' });

      return instagram
        .get('me')
        .auth(access_token)
        .qs({ fields: 'id,username' })
        .request()
        .then(({ body }) => ({
          username: body.username,
          email: `${body.username}@strapi.io`, // dummy email as Instagram does not provide user email
        }));
    }
    case 'vk': {
      const vk = purest({ provider: 'vk' });

      return vk
        .get('users.get')
        .auth(access_token)
        .qs({ id: query.raw.user_id, v: '5.122' })
        .request()
        .then(({ body }) => ({
          username: `${body.response[0].last_name} ${body.response[0].first_name}`,
          email: query.raw.email,
        }));
    }
    case 'twitch': {
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
        .auth(access_token, providers.twitch.key)
        .request()
        .then(({ body }) => ({
          username: body.data[0].login,
          email: body.data[0].email,
        }));
    }
    case 'linkedin': {
      const linkedIn = purest({ provider: 'linkedin' });
      const {
        body: { localizedFirstName },
      } = await linkedIn
        .get('me')
        .auth(access_token)
        .request();
      const {
        body: { elements },
      } = await linkedIn
        .get('emailAddress?q=members&projection=(elements*(handle~))')
        .auth(access_token)
        .request();

      const email = elements[0]['handle~'];

      return {
        username: localizedFirstName,
        email: email.emailAddress,
      };
    }
    case 'reddit': {
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
        .auth(access_token)
        .request()
        .then(({ body }) => ({
          username: body.name,
          email: `${body.name}@strapi.io`, // dummy email as Reddit does not provide user email
        }));
    }
    case 'auth0': {
      const auth0 = purest({ provider: 'auth0' });

      return auth0
        .get('userinfo')
        .subdomain(providers.auth0.subdomain)
        .auth(access_token)
        .request()
        .then(({ body }) => {
          const username = body.username || body.nickname || body.name || body.email.split('@')[0];
          const email = body.email || `${username.replace(/\s+/g, '.')}@strapi.io`;

          return {
            username,
            email,
          };
        });
    }
    case 'cas': {
      const cas = purest({ provider: 'cas' });

      return cas
        .get('oidc/profile')
        .subdomain(providers.cas.subdomain)
        .auth(access_token)
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
              'CAS Response Body did not contain required attributes: ' + JSON.stringify(body)
            );
          }
          return {
            username,
            email,
          };
        });
    }
    default:
      throw new Error('Unknown provider.');
  }
};
