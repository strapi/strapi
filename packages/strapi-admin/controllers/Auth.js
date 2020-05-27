'use strict';

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

/* eslint-disable no-useless-escape */
const crypto = require('crypto');

const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
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
