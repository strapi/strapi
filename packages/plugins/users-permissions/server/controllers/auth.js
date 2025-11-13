'use strict';

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

/* eslint-disable no-useless-escape */
const crypto = require('crypto');
const _ = require('lodash');
const { concat, compact, isArray } = require('lodash/fp');
const utils = require('@strapi/utils');
const { getService } = require('../utils');
const {
  validateCallbackBody,
  validateRegisterBody,
  validateSendEmailConfirmationBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateEmailConfirmationBody,
  validateChangePasswordBody,
} = require('./validation/auth');

const { ApplicationError, ValidationError, ForbiddenError } = utils.errors;

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');

  return strapi.contentAPI.sanitize.output(user, userSchema, { auth });
};

const extractDeviceId = (requestBody) => {
  const { deviceId } = requestBody || {};

  return typeof deviceId === 'string' && deviceId.length > 0 ? deviceId : undefined;
};

module.exports = ({ strapi }) => ({
  async callback(ctx) {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;

    const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const grantSettings = await store.get({ key: 'grant' });

    const grantProvider = provider === 'local' ? 'email' : provider;

    if (!_.get(grantSettings, [grantProvider, 'enabled'])) {
      throw new ApplicationError('This provider is disabled');
    }

    if (provider === 'local') {
      await validateCallbackBody(params);

      const { identifier } = params;

      // Check if the user exists.
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          provider,
          $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
        },
      });

      if (!user) {
        throw new ValidationError('Invalid identifier or password');
      }

      if (!user.password) {
        throw new ValidationError('Invalid identifier or password');
      }

      const validPassword = await getService('user').validatePassword(
        params.password,
        user.password
      );

      if (!validPassword) {
        throw new ValidationError('Invalid identifier or password');
      }

      const advancedSettings = await store.get({ key: 'advanced' });
      const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

      if (requiresConfirmation && user.confirmed !== true) {
        throw new ApplicationError('Your account email is not confirmed');
      }

      if (user.blocked === true) {
        throw new ApplicationError('Your account has been blocked by an administrator');
      }

      const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');
      if (mode === 'refresh') {
        const deviceId = extractDeviceId(ctx.request.body);

        const refresh = await strapi
          .sessionManager('users-permissions')
          .generateRefreshToken(String(user.id), deviceId, { type: 'refresh' });

        const access = await strapi
          .sessionManager('users-permissions')
          .generateAccessToken(refresh.token);
        if ('error' in access) {
          throw new ApplicationError('Invalid credentials');
        }

        const upSessions = strapi.config.get('plugin::users-permissions.sessions');
        const requestHttpOnly = ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly';
        if (upSessions?.httpOnly || requestHttpOnly) {
          const cookieName = upSessions.cookie?.name || 'strapi_up_refresh';
          const isProduction = process.env.NODE_ENV === 'production';
          const isSecure =
            typeof upSessions.cookie?.secure === 'boolean'
              ? upSessions.cookie?.secure
              : isProduction;

          const cookieOptions = {
            httpOnly: true,
            secure: isSecure,
            sameSite: upSessions.cookie?.sameSite ?? 'lax',
            path: upSessions.cookie?.path ?? '/',
            domain: upSessions.cookie?.domain,
            overwrite: true,
          };

          ctx.cookies.set(cookieName, refresh.token, cookieOptions);
          return ctx.send({ jwt: access.token, user: await sanitizeUser(user, ctx) });
        }

        return ctx.send({
          jwt: access.token,
          refreshToken: refresh.token,
          user: await sanitizeUser(user, ctx),
        });
      }

      return ctx.send({
        jwt: getService('jwt').issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    }

    // Connect the user with the third-party provider.
    try {
      const user = await getService('providers').connect(provider, ctx.query);

      if (user.blocked) {
        throw new ForbiddenError('Your account has been blocked by an administrator');
      }

      const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');
      if (mode === 'refresh') {
        const deviceId = extractDeviceId(ctx.request.body);

        const refresh = await strapi
          .sessionManager('users-permissions')
          .generateRefreshToken(String(user.id), deviceId, { type: 'refresh' });

        const access = await strapi
          .sessionManager('users-permissions')
          .generateAccessToken(refresh.token);
        if ('error' in access) {
          throw new ApplicationError('Invalid credentials');
        }

        const upSessions = strapi.config.get('plugin::users-permissions.sessions');
        const requestHttpOnly = ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly';
        if (upSessions?.httpOnly || requestHttpOnly) {
          const cookieName = upSessions.cookie?.name || 'strapi_up_refresh';
          const isProduction = process.env.NODE_ENV === 'production';
          const isSecure =
            typeof upSessions.cookie?.secure === 'boolean'
              ? upSessions.cookie?.secure
              : isProduction;

          const cookieOptions = {
            httpOnly: true,
            secure: isSecure,
            sameSite: upSessions.cookie?.sameSite ?? 'lax',
            path: upSessions.cookie?.path ?? '/',
            domain: upSessions.cookie?.domain,
            overwrite: true,
          };
          ctx.cookies.set(cookieName, refresh.token, cookieOptions);
          return ctx.send({ jwt: access.token, user: await sanitizeUser(user, ctx) });
        }
        return ctx.send({
          jwt: access.token,
          refreshToken: refresh.token,
          user: await sanitizeUser(user, ctx),
        });
      }

      return ctx.send({
        jwt: getService('jwt').issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },

  async changePassword(ctx) {
    if (!ctx.state.user) {
      throw new ApplicationError('You must be authenticated to reset your password');
    }

    const validations = strapi.config.get('plugin::users-permissions.validationRules');

    const { currentPassword, password } = await validateChangePasswordBody(
      ctx.request.body,
      validations
    );

    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });

    const validPassword = await getService('user').validatePassword(currentPassword, user.password);

    if (!validPassword) {
      throw new ValidationError('The provided current password is invalid');
    }

    if (currentPassword === password) {
      throw new ValidationError('Your new password must be different than your current password');
    }

    await getService('user').edit(user.id, { password });

    const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');
    if (mode === 'refresh') {
      const deviceId = extractDeviceId(ctx.request.body);

      if (deviceId) {
        // Invalidate sessions: specific device if deviceId provided
        await strapi
          .sessionManager('users-permissions')
          .invalidateRefreshToken(String(user.id), deviceId);
      }

      const newDeviceId = deviceId || crypto.randomUUID();
      const refresh = await strapi
        .sessionManager('users-permissions')
        .generateRefreshToken(String(user.id), newDeviceId, { type: 'refresh' });

      const access = await strapi
        .sessionManager('users-permissions')
        .generateAccessToken(refresh.token);
      if ('error' in access) {
        throw new ApplicationError('Invalid credentials');
      }

      return ctx.send({
        jwt: access.token,
        refreshToken: refresh.token,
        user: await sanitizeUser(user, ctx),
      });
    }

    return ctx.send({
      jwt: getService('jwt').issue({ id: user.id }),
      user: await sanitizeUser(user, ctx),
    });
  },

  async resetPassword(ctx) {
    const validations = strapi.config.get('plugin::users-permissions.validationRules');

    const { password, passwordConfirmation, code } = await validateResetPasswordBody(
      ctx.request.body,
      validations
    );

    if (password !== passwordConfirmation) {
      throw new ValidationError('Passwords do not match');
    }

    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { resetPasswordToken: code } });

    if (!user) {
      throw new ValidationError('Incorrect code provided');
    }

    await getService('user').edit(user.id, {
      resetPasswordToken: null,
      password,
    });

    const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');
    if (mode === 'refresh') {
      const deviceId = extractDeviceId(ctx.request.body);

      if (deviceId) {
        // Invalidate sessions: specific device if deviceId provided
        await strapi
          .sessionManager('users-permissions')
          .invalidateRefreshToken(String(user.id), deviceId);
      }

      const newDeviceId = deviceId || crypto.randomUUID();
      const refresh = await strapi
        .sessionManager('users-permissions')
        .generateRefreshToken(String(user.id), newDeviceId, { type: 'refresh' });

      const access = await strapi
        .sessionManager('users-permissions')
        .generateAccessToken(refresh.token);
      if ('error' in access) {
        throw new ApplicationError('Invalid credentials');
      }

      return ctx.send({
        jwt: access.token,
        refreshToken: refresh.token,
        user: await sanitizeUser(user, ctx),
      });
    }

    return ctx.send({
      jwt: getService('jwt').issue({ id: user.id }),
      user: await sanitizeUser(user, ctx),
    });
  },
  async refresh(ctx) {
    const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');
    if (mode !== 'refresh') {
      return ctx.notFound();
    }

    const { refreshToken } = ctx.request.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return ctx.badRequest('Missing refresh token');
    }

    const rotation = await strapi
      .sessionManager('users-permissions')
      .rotateRefreshToken(refreshToken);
    if ('error' in rotation) {
      return ctx.unauthorized('Invalid refresh token');
    }

    const result = await strapi
      .sessionManager('users-permissions')
      .generateAccessToken(rotation.token);
    if ('error' in result) {
      return ctx.unauthorized('Invalid refresh token');
    }

    const upSessions = strapi.config.get('plugin::users-permissions.sessions');
    const requestHttpOnly = ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly';
    if (upSessions?.httpOnly || requestHttpOnly) {
      const cookieName = upSessions.cookie?.name || 'strapi_up_refresh';
      const isProduction = process.env.NODE_ENV === 'production';
      const isSecure =
        typeof upSessions.cookie?.secure === 'boolean' ? upSessions.cookie?.secure : isProduction;

      const cookieOptions = {
        httpOnly: true,
        secure: isSecure,
        sameSite: upSessions.cookie?.sameSite ?? 'lax',
        path: upSessions.cookie?.path ?? '/',
        domain: upSessions.cookie?.domain,
        overwrite: true,
      };
      ctx.cookies.set(cookieName, rotation.token, cookieOptions);
      return ctx.send({ jwt: result.token });
    }
    return ctx.send({ jwt: result.token, refreshToken: rotation.token });
  },
  async logout(ctx) {
    const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');
    if (mode !== 'refresh') {
      return ctx.notFound();
    }

    // Invalidate all sessions for the authenticated user, or by deviceId if provided
    if (!ctx.state.user) {
      return ctx.unauthorized('Missing authentication');
    }

    const deviceId = extractDeviceId(ctx.request.body);
    try {
      await strapi
        .sessionManager('users-permissions')
        .invalidateRefreshToken(String(ctx.state.user.id), deviceId);
    } catch (err) {
      strapi.log.error('UP logout failed', err);
    }

    const upSessions = strapi.config.get('plugin::users-permissions.sessions');
    const requestHttpOnly = ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly';
    if (upSessions?.httpOnly || requestHttpOnly) {
      const cookieName = upSessions.cookie?.name || 'strapi_up_refresh';
      ctx.cookies.set(cookieName, '', { expires: new Date(0) });
    }
    return ctx.send({ ok: true });
  },
  async connect(ctx, next) {
    const grant = require('grant').koa();

    const providers = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get();

    const apiPrefix = strapi.config.get('api.rest.prefix');
    const grantConfig = {
      defaults: {
        prefix: `${apiPrefix}/connect`,
      },
      ...providers,
    };

    const [requestPath] = ctx.request.url.split('?');
    const provider = requestPath.split('/connect/')[1].split('/')[0];

    if (!_.get(grantConfig[provider], 'enabled')) {
      throw new ApplicationError('This provider is disabled');
    }

    if (!strapi.config.server.url.startsWith('http')) {
      strapi.log.warn(
        'You are using a third party provider for login. Make sure to set an absolute url in config/server.js. More info here: https://docs.strapi.io/developer-docs/latest/plugins/users-permissions.html#setting-up-the-server-url'
      );
    }

    // Ability to pass OAuth callback dynamically
    const queryCustomCallback = _.get(ctx, 'query.callback');
    const dynamicSessionCallback = _.get(ctx, 'session.grant.dynamic.callback');

    const customCallback = queryCustomCallback ?? dynamicSessionCallback;

    // The custom callback is validated to make sure it's not redirecting to an unwanted actor.
    if (customCallback !== undefined) {
      try {
        // We're extracting the callback validator from the plugin config since it can be user-customized
        const { validate: validateCallback } = strapi
          .plugin('users-permissions')
          .config('callback');

        await validateCallback(customCallback, grantConfig[provider]);

        grantConfig[provider].callback = customCallback;
      } catch (e) {
        throw new ValidationError('Invalid callback URL provided', { callback: customCallback });
      }
    }

    // Build a valid redirect URI for the current provider
    grantConfig[provider].redirect_uri = getService('providers').buildRedirectUri(provider);

    return grant(grantConfig)(ctx, next);
  },

  async forgotPassword(ctx) {
    const { email } = await validateForgotPasswordBody(ctx.request.body);

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const emailSettings = await pluginStore.get({ key: 'email' });
    const advancedSettings = await pluginStore.get({ key: 'advanced' });

    // Find the user by email.
    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email: email.toLowerCase() } });

    if (!user || user.blocked) {
      return ctx.send({ ok: true });
    }

    // Generate random token.
    const userInfo = await sanitizeUser(user, ctx);

    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    const resetPasswordSettings = _.get(emailSettings, 'reset_password.options', {});
    const emailBody = await getService('users-permissions').template(
      resetPasswordSettings.message,
      {
        URL: advancedSettings.email_reset_password,
        SERVER_URL: strapi.config.get('server.absoluteUrl'),
        ADMIN_URL: strapi.config.get('admin.absoluteUrl'),
        USER: userInfo,
        TOKEN: resetPasswordToken,
      }
    );

    const emailObject = await getService('users-permissions').template(
      resetPasswordSettings.object,
      {
        USER: userInfo,
      }
    );

    const emailToSend = {
      to: user.email,
      from:
        resetPasswordSettings.from.email || resetPasswordSettings.from.name
          ? `${resetPasswordSettings.from.name} <${resetPasswordSettings.from.email}>`
          : undefined,
      replyTo: resetPasswordSettings.response_email,
      subject: emailObject,
      text: emailBody,
      html: emailBody,
    };

    // NOTE: Update the user before sending the email so an Admin can generate the link if the email fails
    await getService('user').edit(user.id, { resetPasswordToken });

    // Send an email to the user.
    await strapi.plugin('email').service('email').send(emailToSend);

    ctx.send({ ok: true });
  },

  async register(ctx) {
    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const settings = await pluginStore.get({ key: 'advanced' });

    if (!settings.allow_register) {
      throw new ApplicationError('Register action is currently disabled');
    }

    const { register } = strapi.config.get('plugin::users-permissions');
    const alwaysAllowedKeys = ['username', 'password', 'email'];

    // Note that we intentionally do not filter allowedFields to allow a project to explicitly accept private or other Strapi field on registration
    const allowedKeys = compact(
      concat(alwaysAllowedKeys, isArray(register?.allowedFields) ? register.allowedFields : [])
    );

    // Check if there are any keys in requestBody that are not in allowedKeys
    const invalidKeys = Object.keys(ctx.request.body).filter((key) => !allowedKeys.includes(key));

    if (invalidKeys.length > 0) {
      // If there are invalid keys, throw an error
      throw new ValidationError(`Invalid parameters: ${invalidKeys.join(', ')}`);
    }

    const params = {
      ..._.pick(ctx.request.body, allowedKeys),
      provider: 'local',
    };

    const validations = strapi.config.get('plugin::users-permissions.validationRules');

    await validateRegisterBody(params, validations);

    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: settings.default_role } });

    if (!role) {
      throw new ApplicationError('Impossible to find the default role');
    }

    const { email, username, provider } = params;

    const identifierFilter = {
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() },
        { username },
        { email: username },
      ],
    };

    const conflictingUserCount = await strapi.db.query('plugin::users-permissions.user').count({
      where: { ...identifierFilter, provider },
    });

    if (conflictingUserCount > 0) {
      throw new ApplicationError('Email or Username are already taken');
    }

    if (settings.unique_email) {
      const conflictingUserCount = await strapi.db.query('plugin::users-permissions.user').count({
        where: { ...identifierFilter },
      });

      if (conflictingUserCount > 0) {
        throw new ApplicationError('Email or Username are already taken');
      }
    }

    const newUser = {
      ...params,
      role: role.id,
      email: email.toLowerCase(),
      username,
      confirmed: !settings.email_confirmation,
    };

    const user = await getService('user').add(newUser);

    const sanitizedUser = await sanitizeUser(user, ctx);

    if (settings.email_confirmation) {
      try {
        await getService('user').sendConfirmationEmail(sanitizedUser);
      } catch (err) {
        strapi.log.error(err);
        throw new ApplicationError('Error sending confirmation email');
      }

      return ctx.send({ user: sanitizedUser });
    }

    const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');
    if (mode === 'refresh') {
      const deviceId = extractDeviceId(ctx.request.body) || crypto.randomUUID();

      const refresh = await strapi
        .sessionManager('users-permissions')
        .generateRefreshToken(String(user.id), deviceId, { type: 'refresh' });

      const access = await strapi
        .sessionManager('users-permissions')
        .generateAccessToken(refresh.token);
      if ('error' in access) {
        throw new ApplicationError('Invalid credentials');
      }

      return ctx.send({ jwt: access.token, refreshToken: refresh.token, user: sanitizedUser });
    }

    const jwt = getService('jwt').issue(_.pick(user, ['id']));
    return ctx.send({ jwt, user: sanitizedUser });
  },

  async emailConfirmation(ctx, next, returnUser) {
    const { confirmation: confirmationToken } = await validateEmailConfirmationBody(ctx.query);

    const userService = getService('user');
    const jwtService = getService('jwt');

    const [user] = await userService.fetchAll({ filters: { confirmationToken } });

    if (!user) {
      throw new ValidationError('Invalid token');
    }

    await userService.edit(user.id, { confirmed: true, confirmationToken: null });

    if (returnUser) {
      ctx.send({
        jwt: jwtService.issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    } else {
      const settings = await strapi
        .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
        .get();

      ctx.redirect(settings.email_confirmation_redirection || '/');
    }
  },

  async sendEmailConfirmation(ctx) {
    const { email } = await validateSendEmailConfirmationBody(ctx.request.body);

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return ctx.send({ email, sent: true });
    }

    if (user.confirmed) {
      throw new ApplicationError('Already confirmed');
    }

    if (user.blocked) {
      throw new ApplicationError('User blocked');
    }

    await getService('user').sendConfirmationEmail(user);

    ctx.send({
      email: user.email,
      sent: true,
    });
  },
});
