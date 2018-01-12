'use strict';

/**
 * Module dependencies.
 */

// Public node modules.
const _ = require('lodash');

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

const linkedin = new Purest({
  provider: 'linkedin'
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

exports.connect = (provider, access_token) => {
  return new Promise((resolve, reject) => {
    if (!access_token) {
      reject({
        message: 'No access_token.'
      });
    } else {
      // Get the profile.
      getProfile(provider, access_token, (err, profile) => {
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

const getProfile = (provider, access_token, callback) => {
  let fields;
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
      github.query().get('user').auth(access_token).request((err, res, body) => {
        if (err) {
          callback(err);
        } else {
          callback(null, {
            username: body.login,
            email: body.email
          });
        }
      });
      break;
    case 'linkedin2':
      fields = [
        'public-profile-url', 'email-address'
      ];
      linkedin.query().select('people/~:(' + fields.join() + ')?format=json').auth(access_token).request((err, res, body) => {
        if (err) {
          callback(err);
        } else {
          callback(null, {
            username: substr(body.publicProfileUrl.lastIndexOf('/') + 1),
            email: body.emailAddress
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
