'use strict';

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

/* eslint-disable no-useless-escape */
const crypto = require('crypto');
const _ = require('lodash');

const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

module.exports = {
  async callback(ctx) {
    const params = ctx.request.body;

    // The identifier is required.
    if (!params.identifier) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.email.provide' }] }]
          : 'Please provide your username or your e-mail.'
      );
    }

    // The password is required.
    if (!params.password) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.password.provide' }] }]
          : 'Please provide your password.'
      );
    }

    const query = {};

    // Check if the provided identifier is an email or not.
    const isEmail = emailRegExp.test(params.identifier);

    // Set the identifier to the appropriate query field.
    if (isEmail) {
      query.email = params.identifier.toLowerCase();
    } else {
      query.username = params.identifier;
    }

    // Check if the admin exists.
    const admin = await strapi.query('administrator', 'admin').findOne(query);

    if (!admin) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.invalid' }] }]
          : 'Identifier or password invalid.'
      );
    }

    if (admin.blocked === true) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.blocked' }] }]
          : 'Your account has been blocked by the administrator.'
      );
    }

    const validPassword = await strapi.admin.services.auth.validatePassword(
      params.password,
      admin.password
    );

    if (!validPassword) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.invalid' }] }]
          : 'Identifier or password invalid.'
      );
    } else {
      admin.isAdmin = true;

      ctx.send({
        jwt: strapi.admin.services.auth.createJwtToken(admin),
        user: strapi.admin.services.auth.sanitizeUser(admin),
      });
    }
  },

  async register(ctx) {
    const params = ctx.request.body;

    // Username is required.
    if (!params.username) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.username.provide' }] }]
          : 'Please provide your username.'
      );
    }

    // Email is required.
    if (!params.email) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.email.provide' }] }]
          : 'Please provide your email.'
      );
    }

    // Check if the provided email is valid or not.
    const isEmail = emailRegExp.test(params.email);

    if (isEmail) {
      params.email = params.email.toLowerCase();
    } else {
      return ctx.badRequest('Invalid email format');
    }

    // Password is required.
    if (!params.password) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.password.provide' }] }]
          : 'Please provide your password.'
      );
    }

    // First, check if their is at least one admin
    const admins = await strapi
      .query('administrator', 'admin')
      .find({ _limit: 1 });

    if (admins.length > 0) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.admin.exist' }] }]
          : "You can't register a new admin."
      );
    }

    params.password = await strapi.admin.services.auth.hashPassword(
      params.password
    );

    const admin = await strapi.query('administrator', 'admin').findOne({
      email: params.email,
    });

    if (admin) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.email.taken' }] }]
          : 'Email is already taken.'
      );
    }

    try {
      const admin = await strapi.query('administrator', 'admin').create(params);

      admin.isAdmin = true;

      const jwt = strapi.admin.services.auth.createJwtToken(admin);

      strapi.emit('didCreateFirstAdmin');

      ctx.send({
        jwt,
        user: strapi.admin.services.auth.sanitizeUser(admin),
      });
    } catch (err) {
      strapi.log.error(err);
      const adminError = _.includes(err.message, 'username')
        ? 'Auth.form.error.username.taken'
        : 'Auth.form.error.email.taken';

      ctx.badRequest(
        null,
        ctx.request.admin ? [{ messages: [{ id: adminError }] }] : err.message
      );
    }
  },

  async changePassword(ctx) {
    const { password, passwordConfirmation, code } = {
      ...ctx.request.body,
      ...ctx.params,
    };

    if (!password) return ctx.badRequest('Missing password');
    if (!passwordConfirmation)
      return ctx.badRequest('Missing passwordConfirmation');
    if (!code) return ctx.badRequest('Missing code');

    if (password !== passwordConfirmation) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.password.matching' }] }]
          : 'Passwords do not match.'
      );
    }

    const admin = await strapi
      .query('administrator', 'admin')
      .findOne({ resetPasswordToken: code });

    if (!admin) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.code.provide' }] }]
          : 'Incorrect code provided.'
      );
    }

    const data = {
      resetPasswordToken: null,
      password: await strapi.admin.services.auth.hashPassword(password),
    };

    const updatedAdmin = await strapi
      .query('administrator', 'admin')
      .update({ id: admin.id }, data);

    return ctx.send({
      jwt: strapi.admin.services.auth.createJwtToken(updatedAdmin),
      user: strapi.admin.services.auth.sanitizeUser(updatedAdmin),
    });
  },

  async forgotPassword(ctx) {
    const { email, url } = ctx.request.body;

    if (!email) return ctx.badRequest('Missing email');
    if (!url) return ctx.badRequest('Missing url');

    // Find the admin thanks to his email.
    const admin = await strapi
      .query('administrator', 'admin')
      .findOne({ email });

    // admin not found.
    if (!admin) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: 'Auth.form.error.user.not-exist' }] }]
          : 'This email does not exist.'
      );
    }

    // Generate random token.
    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    const settings = {
      from: {
        name: 'Administration Panel',
        email: 'no-reply@strapi.io',
      },
      response_email: '',
      object: '­Reset password',
      message: `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>

<p>${url}?code=${resetPasswordToken}</p>

<p>Thanks.</p>`,
    };

    try {
      // Send an email to the admin.
      await strapi.plugins['email'].services.email.send({
        to: admin.email,
        from:
          settings.from.email || settings.from.name
            ? `"${settings.from.name}" <${settings.from.email}>`
            : undefined,
        replyTo: settings.response_email,
        subject: settings.object,
        text: settings.message,
        html: settings.message,
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }

    // Update the admin.
    await strapi
      .query('administrator', 'admin')
      .update({ id: admin.id }, { resetPasswordToken });

    ctx.send({ ok: true });
  },
};
