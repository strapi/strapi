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
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.email.provide' }] }] : 'Please provide your username or your e-mail.');
      }

      // The password is required.
      if (!params.password) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.provide' }] }] : 'Please provide your password.');
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
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.invalid' }] }] : 'Identifier or password invalid.');
      }

      // The user never registered with the `local` provider.
      if (!user.password) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.local' }] }] : 'This user never set a local password, please login thanks to the provider used during account creation.');
      }

      const validPassword = strapi.plugins['users-permissions'].services.user.validatePassword(params.password, user.password);

      if (!validPassword) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.invalid' }] }] : 'Identifier or password invalid.');
      } else {
        ctx.send({
          jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
          user: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken'])
        });
      }
    } else {
      // Connect the user thanks to the third-party provider.
      const user = await strapi.api.user.services.grant.connect(provider, access_token);

      ctx.redirect(strapi.config.frontendUrl || strapi.config.url + '?jwt=' + strapi.api.user.services.jwt.issue(user) + '&user=' + JSON.stringify(user));
    }
  },

  changePassword: async (ctx) => {
    const params = _.assign({}, ctx.request.body, ctx.params);

    if (params.password && params.passwordConfirmation && params.password === params.passwordConfirmation && params.code) {
      const user = await strapi.query('user', 'users-permissions').findOne({ resetPasswordToken: params.code });

      if (!user) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.code.provide' }] }] : 'Incorrect code provided.');
      }

      // Delete the current code
      user.resetPasswordToken = null;

      user.password =  await strapi.plugins['users-permissions'].services.user.hashPassword(params);

      // Update the user.
      await strapi.query('user', 'users-permissions').update(user);

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
        user: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken'])
      });
    } else if (params.password && params.passwordConfirmation && params.password !== params.passwordConfirmation) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.matching' }] }] : 'Passwords do not match.');
    } else {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.params.provide' }] }] : 'Incorrect params provided.');
    }
  },

  forgotPassword: async (ctx) => {
    const { email, url } = ctx.request.body;

    // Find the user user thanks to his email.
    const user = await strapi.query('user', 'users-permissions').findOne({ email });

    // User not found.
    if (!user) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.user.not-exist' }] }] : 'This email does not exist.');
    }

    // Generate random token.
    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    // Set the property code.
    user.resetPasswordToken = resetPasswordToken;

    // Send an email to the user.
    const template = `
      <p>We heard that you lost your password. Sorry about that!</p>

      <p>But don’t worry! You can use the following link to reset your password:</p>

      <p>${url}?code=${resetPasswordToken}</p>

      <p>Thanks.</p>
    `;

    try {
      await strapi.plugins['email'].services.email.send({
        to: user.email,
        subject: '­Reset password 🔑 ',
        text: template,
        html: template
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }

    // Update the user.
    await strapi.query('user', 'users-permissions').update(user);

    ctx.send({ ok: true });
  },

  register: async (ctx) => {
    const params = _.assign(ctx.request.body, {
      provider: 'local'
    });

    // Password is required.
    if (!params.password) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.provide' }] }] : 'Please provide your password.');
    }

    // Throw an error if the password selected by the user
    // contains more than two times the symbol '$'.
    if (strapi.plugins['users-permissions'].services.user.isHashed(params.password)) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.format' }] }] : 'Your password cannot contain more than three times the symbol `$`.');
    }

    // First, check if the user is the first one to register as admin.
    const adminUsers = await strapi.query('user', 'users-permissions').find(strapi.utils.models.convertParams('user', { role: '0' }));

    // Check if the user is the first to register
    if (adminUsers.length === 0) {
      params.role = '0';
    } else {
      params.role = '1';
    }

    params.password = await strapi.plugins['users-permissions'].services.user.hashPassword(params);

    try {
      const user = await strapi.query('user', 'users-permissions').create(params);

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue(user),
        user: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken'])
      });

    } catch(err) {
      const adminError = _.includes(err.message, 'username') ? 'Auth.form.error.username.taken' : 'Auth.form.error.email.taken';

      ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: adminError }] }] : err.message);
    }
  }
};
