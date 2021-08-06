'use strict';

const passport = require('koa-passport');
const compose = require('koa-compose');

const { getService } = require('../utils');
const {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateResetPasswordInput,
} = require('../validation/authentication');

module.exports = {
  login: compose([
    (ctx, next) => {
      return passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
          strapi.eventHub.emit('admin.auth.error', { error: err, provider: 'local' });
          return ctx.badImplementation();
        }

        if (!user) {
          strapi.eventHub.emit('admin.auth.error', {
            error: new Error(info.message),
            provider: 'local',
          });
          return ctx.badRequest(info.message);
        }

        ctx.state.user = user;

        strapi.eventHub.emit('admin.auth.success', { user, provider: 'local' });

        return next();
      })(ctx, next);
    },
    ctx => {
      const { user } = ctx.state;

      ctx.body = {
        data: {
          token: getService('token').createJwtToken(user),
          user: getService('user').sanitizeUser(ctx.state.user), // TODO: fetch more detailed info
        },
      };
    },
  ]),

  renewToken(ctx) {
    const { token } = ctx.request.body;

    if (token === undefined) {
      return ctx.badRequest('Missing token');
    }

    const { isValid, payload } = getService('token').decodeJwtToken(token);

    if (!isValid) {
      return ctx.badRequest('Invalid token');
    }

    ctx.body = {
      data: {
        token: getService('token').createJwtToken({ id: payload.id }),
      },
    };
  },

  async registrationInfo(ctx) {
    try {
      await validateRegistrationInfoQuery(ctx.request.query);
    } catch (err) {
      return ctx.badRequest('QueryError', err);
    }

    const { registrationToken } = ctx.request.query;

    const registrationInfo = await getService('user').findRegistrationInfo(registrationToken);

    if (!registrationInfo) {
      return ctx.badRequest('Invalid registrationToken');
    }

    ctx.body = { data: registrationInfo };
  },

  async register(ctx) {
    const input = ctx.request.body;

    try {
      await validateRegistrationInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const user = await getService('user').register(input);

    ctx.body = {
      data: {
        token: getService('token').createJwtToken(user),
        user: getService('user').sanitizeUser(user),
      },
    };
  },

  async registerAdmin(ctx) {
    const input = ctx.request.body;

    try {
      await validateAdminRegistrationInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const hasAdmin = await getService('user').exists();

    if (hasAdmin) {
      return ctx.badRequest('You cannot register a new super admin');
    }

    const superAdminRole = await getService('role').getSuperAdmin();

    if (!superAdminRole) {
      throw new Error(
        "Cannot register the first admin because the super admin role doesn't exist."
      );
    }

    const user = await getService('user').create({
      ...input,
      registrationToken: null,
      isActive: true,
      roles: superAdminRole ? [superAdminRole.id] : [],
    });

    strapi.telemetry.send('didCreateFirstAdmin');

    ctx.body = {
      data: {
        token: getService('token').createJwtToken(user),
        user: getService('user').sanitizeUser(user),
      },
    };
  },

  async forgotPassword(ctx) {
    const input = ctx.request.body;

    try {
      await validateForgotPasswordInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    getService('auth').forgotPassword(input);

    ctx.status = 204;
  },

  async resetPassword(ctx) {
    const input = ctx.request.body;

    try {
      await validateResetPasswordInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const user = await getService('auth').resetPassword(input);

    ctx.body = {
      data: {
        token: getService('token').createJwtToken(user),
        user: getService('user').sanitizeUser(user),
      },
    };
  },
};
