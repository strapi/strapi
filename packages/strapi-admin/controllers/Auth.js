'use strict';

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

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
};
