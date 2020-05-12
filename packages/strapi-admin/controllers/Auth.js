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
const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  async callback(ctx) {
    const params = ctx.request.body;

    // The identifier is required.
    if (!params.identifier) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.email.provide',
          message: 'Please provide your username or your e-mail.',
        })
      );
    }

    // The password is required.
    if (!params.password) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.password.provide',
          message: 'Please provide your password.',
        })
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
    const admin = await strapi.query('user', 'admin').findOne(query);

    if (!admin) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.invalid',
          message: 'Identifier or password invalid.',
        })
      );
    }

    if (admin.blocked === true) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.blocked',
          message: 'Your account has been blocked by the administrator.',
        })
      );
    }

    const validPassword = await strapi.admin.services.auth.validatePassword(
      params.password,
      admin.password
    );

    if (!validPassword) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.invalid',
          message: 'Identifier or password invalid.',
        })
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
        formatError({
          id: 'Auth.form.error.username.provide',
          message: 'Please provide your username.',
        })
      );
    }

    // Email is required.
    if (!params.email) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.email.provide',
          message: 'Please provide your email.',
        })
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
        formatError({
          id: 'Auth.form.error.password.provide',
          message: 'Please provide your password.',
        })
      );
    }

    // First, check if their is at least one admin
    const admins = await strapi.query('user', 'admin').find({ _limit: 1 });

    if (admins.length > 0) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.admin.exist',
          message: "You can't register a new admin",
        })
      );
    }

    params.password = await strapi.admin.services.auth.hashPassword(params.password);

    const admin = await strapi.query('user', 'admin').findOne({
      email: params.email,
    });

    if (admin) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.email.taken',
          message: 'Email is already taken',
        })
      );
    }

    try {
      const admin = await strapi.query('user', 'admin').create(params);

      admin.isAdmin = true;

      const jwt = strapi.admin.services.auth.createJwtToken(admin);

      await strapi.telemetry.send('didCreateFirstAdmin');

      ctx.send({
        jwt,
        user: strapi.admin.services.auth.sanitizeUser(admin),
      });
    } catch (err) {
      strapi.log.error(err);
      const adminError = _.includes(err.message, 'username')
        ? {
            id: 'Auth.form.error.username.taken',
            message: 'Username already taken',
          }
        : { id: 'Auth.form.error.email.taken', message: 'Email already taken' };

      ctx.badRequest(null, formatError(adminError));
    }
  },

  async resetPassword(ctx) {
    const { password, passwordConfirmation, code } = {
      ...ctx.request.body,
      ...ctx.params,
    };

    if (!password) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'missing.password',
          message: 'Missing password',
        })
      );
    }

    if (!passwordConfirmation) {
      return ctx.badRequest(
        formatError({
          id: 'missing.passwordConfirmation',
          message: 'Missing passwordConfirmation',
        })
      );
    }

    if (!code) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'missing.code',
          message: 'Missing code',
        })
      );
    }

    if (password !== passwordConfirmation) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.password.matching',
          message: 'Passwords do not match.',
        })
      );
    }

    const admin = await strapi.query('user', 'admin').findOne({ resetPasswordToken: `${code}` });

    if (!admin) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.code.provide',
          message: 'Incorrect code provided.',
        })
      );
    }

    const data = {
      resetPasswordToken: null,
      password: await strapi.admin.services.auth.hashPassword(password),
    };

    const updatedAdmin = await strapi.query('user', 'admin').update({ id: admin.id }, data);

    return ctx.send({
      jwt: strapi.admin.services.auth.createJwtToken(updatedAdmin),
      user: strapi.admin.services.auth.sanitizeUser(updatedAdmin),
    });
  },

  async forgotPassword(ctx) {
    const { email, url } = ctx.request.body;

    if (!email) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'missing.email',
          message: 'Missing email',
        })
      );
    }
    if (!url) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'missing.url',
          message: 'Missing url',
        })
      );
    }

    // Find the admin thanks to his email.
    const admin = await strapi.query('user', 'admin').findOne({ email });

    // admin not found.
    if (!admin) {
      return ctx.badRequest(
        null,
        // FIXME it's not a good security practice to let user know if the email address is registered
        // it'd better to say something like "Email was sent to xyz@xyz.com"
        // this way potential hacker doesn't know if email is registered or not
        formatError({
          id: 'Auth.form.error.user.not-exist',
          message: 'This email does not exit',
        })
      );
    }

    // Generate random token.
    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    const settings = {
      object: 'Reset password',
      message: `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>

<p>${url}?code=${resetPasswordToken}</p>

<p>Thanks.</p>`,
    };

    try {
      // Send an email to the admin.
      await strapi.plugins['email'].services.email.send({
        to: admin.email,
        subject: 'Reset password',
        text: settings.message,
        html: settings.message,
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }

    // Update the admin.
    await strapi.query('user', 'admin').update({ id: admin.id }, { resetPasswordToken });

    ctx.send({ ok: true });
  },
};
