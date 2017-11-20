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
        return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.email.provide' }] }]);
      }

      // The password is required.
      if (!params.password) {
        return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.password.provide' }] }]);
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
      const user = await strapi.query('user', 'users-permissions').findOne(query);

      if (!user) {
        return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.invalid' }] }]);
      }

      // The user never registered with the `local` provider.
      if (!user.password) {
        return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.password.local' }] }]);
      }

      const validPassword = strapi.plugins['users-permissions'].services.user.validatePassword(params.password, user.password);

      if (!validPassword) {
        return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.invalid' }] }]);
      } else {
        ctx.send({
          jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
          user: user
        });
      }
    } else {
      // Connect the user thanks to the third-party provider.
      const user = await strapi.api.user.services.grant.connect(provider, access_token);

      ctx.redirect(strapi.config.frontendUrl || strapi.config.url + '?jwt=' + strapi.api.user.services.jwt.issue(user) + '&user=' + JSON.stringify(user));
    }
  },

  register: async (ctx) => {
    const params = _.assign(ctx.request.body, {
      provider: 'local'
    });

    // Password is required.
    if (!params.password) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.password.provide' }] }]);
    }

    // Throw an error if the password selected by the user
    // contains more than two times the symbol '$'.
    if (strapi.plugins['users-permissions'].services.user.isHashed(params.password)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.password.format' }] }]);
    }

    // First, check if the user is the first one to register as admin.
    const adminUsers = await strapi.query('user', 'users-permissions').find({ admin: true });

    // Check if the user is the first to register
    if (adminUsers.length === 0) {
      params.admin = true;
    }

    params.password = await strapi.plugins['users-permissions'].services.user.hashPassword(params);

    const user = await strapi.query('user', 'users-permissions').create({
      values: params
    });

    ctx.send({
      jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
      user: user
    });
  },

  forgotPassword: async (ctx) => {
    const email = ctx.request.body.email;
    const url = ctx.request.body.url;

    // Find the user user thanks to his email.
    const user = await strapi.query('user', 'users-permissions').findOne({ email });

    // User not found.
    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.user.not-exist' }] }]);
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
    await strapi.plugins['email'].services.email.send({
      to: user.email,
      subject: 'Reset password',
      text: url + '?code=' + resetPasswordToken,
      html: url + '?code=' + resetPasswordToken
    });

    ctx.send();
  },

  changePassword: async (ctx) => {
    const params = _.assign({}, ctx.request.body, ctx.params);

    if (params.password && params.passwordConfirmation && params.password === params.passwordConfirmation && params.code) {
      const user = await strapi.query('user', 'users-permissions').findOne({ resetPasswordToken: params.code });

      if (!user) {
        return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.code.provide' }] }]);
      }

      // Delete the current code
      user.resetPasswordToken = null;

      user.password =  await strapi.plugins['users-permissions'].services.user.hashPassword(params);

      // Update the user.
      await strapi.query('user', 'users-permissions').update({
        id: user.id,
        values: user
      });

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
        user: user
      });
    } else if (params.password && params.passwordConfirmation && params.password !== params.passwordConfirmation) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.password.matching' }] }]);
    } else {
      return ctx.badRequest(null, [{ messages: [{ id: 'Auth.form.error.params.provide' }] }]);
    }
  }
};
