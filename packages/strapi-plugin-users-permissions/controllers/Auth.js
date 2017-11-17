'use strict';

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

const _ = require('lodash');
const crypto = require('crypto');

module.exports = {
  callback: async (ctx) => {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;
    const access_token = ctx.query.access_token;

    if (provider === 'local') {
      // The identifier is required.
      if (!params.identifier) {
        ctx.status = 400;
        return ctx.body = {
          message: 'Please provide your username or your e-mail.'
        };
      }

      // The password is required.
      if (!params.password) {
        ctx.status = 400;
        return ctx.body = {
          message: 'Please provide your password.'
        };
      }

      const query = {};

      // Check if the provided identifier is an email or not.
      const isEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(params.identifier);

      // Set the identifier to the appropriate query field.
      if (isEmail) {
        query.email = params.identifier;
      } else {
        query.username = params.identifier;
      }

      // Check if the user exists.
      try {
        const user = await strapi.query('user', 'users-permissions').findOne(query);

        if (!user) {
          ctx.status = 403;
          return ctx.body = {
            message: 'Identifier or password invalid.'
          };
        }

        // The user never registered with the `local` provider.
        if (!user.password) {
          ctx.status = 400;
          return ctx.body = {
            message: 'This user never set a local password, please login thanks to the provider used during account creation.'
          };
        }

        const validPassword = strapi.plugins['users-permissions'].services.user.validatePassword(params.password, user.password);

        if (!validPassword) {
          ctx.status = 403;
          return ctx.body = {
            message: 'Identifier or password invalid.'
          };
        } else {
          ctx.status = 200;
          ctx.body = {
            jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
            user: user
          };
        }
      } catch (err) {
        ctx.status = 500;
        return ctx.body = {
          message: err.message
        };
      }
    } else {
      // Connect the user thanks to the third-party provider.
      try {
        const user = await strapi.api.user.services.grant.connect(provider, access_token);

        ctx.redirect(strapi.config.frontendUrl || strapi.config.url + '?jwt=' + strapi.api.user.services.jwt.issue(user) + '&user=' + JSON.stringify(user));
      } catch (err) {
        ctx.status = 500;
        return ctx.body = {
          message: err.message
        };
      }
    }
  },

  register: async (ctx) => {
    const params = _.assign(ctx.request.body, {
      provider: 'local'
    });

    // Password is required.
    if (!params.password) {
      ctx.status = 400;
      return ctx.body = {
        message: 'Invalid password field.'
      };
    }

    // Throw an error if the password selected by the user
    // contains more than two times the symbol '$'.
    if (strapi.plugins['users-permissions'].services.user.isHashed(params.password)) {
      ctx.status = 400;
      return ctx.body = {
        message: 'Your password can not contain more than three times the symbol `$`.'
      };
    }

    // First, check if the user is the first one to register.
    try {
      const usersCount = await strapi.query('user', 'users-permissions').count();

      // Check if the user is the first to register
      if (usersCount === 0) {
        params.admin = true;
      }

      params.password = await strapi.plugins['users-permissions'].services.user.hashPassword(params);

      const user = await strapi.query('user', 'users-permissions').create({
        values: params
      });

      ctx.status = 200;
      ctx.body = {
        jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
        user: user
      };
    } catch (err) {
      ctx.status = 500;
      return ctx.body = {
        message: err.message
      };
    }
  },

  forgotPassword: async (ctx) => {
    const email = ctx.request.body.email;
    const url = ctx.request.body.url;

    // Find the user user thanks to his email.
    const user = await strapi.query('user', 'users-permissions').findOne({ email });

    // User not found.
    if (!user) {
      ctx.status = 400;
      return ctx.body = {
        message: 'This email does not exist.'
      };
    }

    // Generate random token.
    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    // Set the property code.
    user.resetPasswordToken = resetPasswordToken;

    // Update the user.
    await strapi.query('user', 'users-permissions').update({
      id: user.id,
      values: user
    });

    // Send an email to the user.
    try {
      await strapi.plugins['email'].services.email.send({
        to: user.email,
        subject: 'Reset password',
        text: url + '?code=' + resetPasswordToken,
        html: url + '?code=' + resetPasswordToken
      });
      ctx.status = 200;
      ctx.body = {};
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        message: 'Error sending the email'
      };
    }
  },

  changePassword: async (ctx) => {
    const params = _.assign({}, ctx.request.body, ctx.params);

    if (params.password && params.passwordConfirmation && params.password === params.passwordConfirmation && params.code) {
      try {
        const user = await strapi.query('user', 'users-permissions').findOne({ resetPasswordToken: params.code });

        if (!user) {
          ctx.status = 400;
          return ctx.body = {
            message: 'Incorrect code provided.'
          };
        }

        // Delete the current code
        user.resetPasswordToken = null;

        user.password =  await strapi.plugins['users-permissions'].services.user.hashPassword(params);

        // Update the user.
        await strapi.query('user', 'users-permissions').update({
          id: user.id,
          values: user
        });

        ctx.status = 200;
        return ctx.body = {
          jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
          user: user
        };
      } catch (err) {
        ctx.status = 500;
        return ctx.body = {
          message: err.message
        };
      }
    } else if (params.password && params.passwordConfirmation && params.password !== params.passwordConfirmation) {
      ctx.status = 400;
      return ctx.body = {
        message: 'Passwords not matching.'
      };
    } else {
      ctx.status = 400;
      return ctx.body = {
        status: 'error',
        message: 'Incorrect params provided.'
      };
    }
  }
};
