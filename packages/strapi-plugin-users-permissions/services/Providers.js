'use strict';

/**
 * Module dependencies.
 */

// Public node modules.
const _ = require('lodash');
const request = require('request');

// Purest strategies.
const Purest = require('purest');

const facebook = new Purest({
  provider: 'facebook'
});

const github = new Purest({
  provider: 'github',
  defaults: {
    headers: {
      'user-agent': 'strapi'
    }
  }
});

const google = new Purest({
  provider: 'google'
});

const twitter = new Purest({
  provider: 'twitter'
});

/**
 * Connect thanks to a third-party provider.
 *
 *
 * @param {String}    provider
 * @param {String}    access_token
 *
 * @return  {*}
 */

exports.connect = (provider, query) => {
  const access_token = query.access_token || query.code || query.oauth_token;

  return new Promise((resolve, reject) => {
    if (!access_token) {
      reject({
        message: 'No access_token.'
      });
    } else {
      // Get the profile.
      getProfile(provider, query, (err, profile) => {
        if (err) {
          reject(err);
        } else {
          // We need at least the mail.
          if (!profile.email) {
            reject({
              message: 'Email was not available.'
            });
          } else {
            strapi.query('user', 'users-permissions').findOne({email: profile.email})
            .then(user => {
              if (!user) {
                // Create the new user.
                const params = _.assign(profile, {
                  provider: provider
                });

                strapi.query('user', 'users-permissions').create(params)
                .then(user => {
                  resolve(user);
                })
                .catch(err => {
                  reject(err);
                });
              } else {
                resolve(user);
              }
            })
            .catch(err => {
              reject(err);
            });
          }
        }
      });
    }
  });
};

/**
 * Helper to get profiles
 *
 * @param {String}   provider
 * @param {Function} callback
 */

const getProfile = (provider, query, callback) => {
  const access_token = query.access_token || query.code || query.oauth_token;

  switch (provider) {
    case 'facebook':
      facebook.query().get('me?fields=name,email').auth(access_token).request((err, res, body) => {
        if (err) {
          callback(err);
        } else {
          callback(null, {
            username: body.name,
            email: body.email
          });
        }
      });
      break;
    case 'google':
      google.query('plus').get('people/me').auth(access_token).request((err, res, body) => {
        if (err) {
          callback(err);
        } else {
          callback(null, {
            username: body.displayName,
            email: body.emails[0].value
          });
        }
      });
      break;
    case 'github':
      request.post({
        url: 'https://github.com/login/oauth/access_token',
        form: {
          client_id: strapi.plugins['users-permissions'].config.grant.github.key,
          client_secret: strapi.plugins['users-permissions'].config.grant.github.secret,
          code: access_token
        }
      }, (err, res, body) => {
        github.query().get('user').auth(body.split('&')[0].split('=')[1]).request((err, res, body) => {
          if (err) {
            callback(err);
          } else {
            callback(null, {
              username: body.login,
              email: body.email
            });
          }
        });
      });
      break;
    case 'twitter':
      twitter.query().get('account/verify_credentials').auth(access_token, query.access_secret).qs({screen_name: query['raw[screen_name]']}).qs({include_email: 'true'}).request((err, res, body) => {
        if (err) {
          callback(err);
        } else {
          callback(null, {
            username: body.screen_name,
            email: body.email
          });
        }
      });
      break;
    default:
      callback({
        message: 'Unknown provider.'
      });
      break;
  }
}
