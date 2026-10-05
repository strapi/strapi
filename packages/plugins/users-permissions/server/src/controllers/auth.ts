import type { Context, Next } from 'koa';
import type { Core, Data } from '@strapi/types';

import crypto from 'crypto';
import _ from 'lodash';
import {
  errors,
  buildSessionMetadata,
  sanitizeSessionEntry,
  sortSessionsForDisplay,
} from '@strapi/utils';
import type {
  PluginContext,
  AdvancedSettings,
  User,
  SessionsConfig,
  EmailSettings,
  GrantConfig,
  ProviderSettings,
} from '../types';
import { getService } from '../utils';
import type { PasswordValidationRules } from './validation/auth';
import { createOAuthConnectMiddleware } from '../utils/oauth-connect';
import { buildRefreshCookieOptions } from '../utils/refresh-cookie-options';
import {
  validateCallbackBody,
  validateRegisterBody,
  validateSendEmailConfirmationBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateEmailConfirmationBody,
  validateChangePasswordBody,
} from './validation/auth';

const { ApplicationError, ValidationError, ForbiddenError } = errors;

const sanitizeUser = (strapi: Core.Strapi, user: unknown, ctx: Context) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');

  return strapi.contentAPI.sanitize.output(user, userSchema, { auth }) as Promise<User>;
};

const extractDeviceId = (requestBody: Record<string, unknown> | undefined) => {
  const { deviceId } = requestBody || {};

  return typeof deviceId === 'string' && deviceId.length > 0 ? deviceId : undefined;
};

const buildSessionMetadataFromContext = (ctx: Context) =>
  buildSessionMetadata({
    userAgent: ctx.request.headers['user-agent'],
  });

const sendRefreshAuthResponse = async (
  strapi: Core.Strapi,
  ctx: Context,
  user: { id: Data.ID },
  { metadata }: { metadata?: ReturnType<typeof buildSessionMetadata> } = {}
) => {
  const deviceId = extractDeviceId(ctx.request.body);
  const tokenOptions = { type: 'refresh' as const, ...(metadata ? { metadata } : {}) };

  const refresh = await strapi
    .sessionManager('users-permissions')
    .generateRefreshToken(String(user.id), deviceId, tokenOptions);

  const access = await strapi
    .sessionManager('users-permissions')
    .generateAccessToken(refresh.token);
  if ('error' in access) {
    throw new ApplicationError('Invalid credentials');
  }

  const upSessions = strapi.config.get<SessionsConfig>('plugin::users-permissions.sessions', {});
  const requestHttpOnly = ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly';

  if (upSessions?.httpOnly || requestHttpOnly) {
    const cookieName = upSessions.cookie?.name || 'strapi_up_refresh';
    const isProduction = process.env.NODE_ENV === 'production';
    ctx.cookies.set(cookieName, refresh.token, buildRefreshCookieOptions(upSessions, isProduction));
    return ctx.send({ jwt: access.token, user: await sanitizeUser(strapi, user, ctx) });
  }

  return ctx.send({
    jwt: access.token,
    refreshToken: refresh.token,
    user: await sanitizeUser(strapi, user, ctx),
  });
};

const reissueTokensAfterPasswordChange = async (
  strapi: Core.Strapi,
  ctx: Context,
  user: { id: Data.ID }
) => {
  const deviceId = extractDeviceId(ctx.request.body);

  await strapi.sessionManager('users-permissions').invalidateRefreshToken(String(user.id));

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
    user: await sanitizeUser(strapi, user, ctx),
  });
};

const revokeLogoutSessions = async (
  strapi: Core.Strapi,
  ctx: Context,
  userId: string,
  { scope, deviceId, body }: { scope?: string; deviceId?: string; body: Record<string, unknown> }
) => {
  const sessionManager = strapi.sessionManager('users-permissions');
  const upSessions = strapi.config.get<SessionsConfig>('plugin::users-permissions.sessions', {});

  if (scope === 'all') {
    await sessionManager.invalidateRefreshToken(userId);
    return;
  }

  if (deviceId) {
    await sessionManager.invalidateRefreshToken(userId, deviceId);
    return;
  }

  let currentSessionId = ctx.state.session?.id;
  const cookieName = upSessions?.cookie?.name || 'strapi_up_refresh';
  const refreshToken =
    ctx.cookies.get(cookieName) ||
    (typeof body.refreshToken === 'string' ? body.refreshToken : undefined);

  if (refreshToken) {
    const validation = await sessionManager.validateRefreshToken(refreshToken);
    if (validation.isValid) {
      currentSessionId = validation.sessionId;
    }
  }

  if (currentSessionId) {
    await sessionManager.revokeSessionById(userId, currentSessionId);
    return;
  }

  await sessionManager.invalidateRefreshToken(userId);
};

/** Create authentication actions for this Strapi instance. */
export default ({ strapi }: PluginContext) => ({
  async callback(ctx: Context) {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;

    const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const grantSettings = (await store.get({ key: 'grant' })) as GrantConfig;

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

      const validPassword = await getService(strapi, 'user').validatePassword(
        params.password,
        user.password
      );

      if (!validPassword) {
        throw new ValidationError('Invalid identifier or password');
      }

      const advancedSettings = (await store.get({ key: 'advanced' })) as AdvancedSettings;
      const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

      if (requiresConfirmation && user.confirmed !== true) {
        throw new ApplicationError('Your account email is not confirmed');
      }

      if (user.blocked === true) {
        throw new ApplicationError('Your account has been blocked by an administrator');
      }

      const mode = strapi.config.get<string>(
        'plugin::users-permissions.jwtManagement',
        'legacy-support'
      );
      if (mode === 'refresh') {
        return sendRefreshAuthResponse(strapi, ctx, user, {
          metadata: buildSessionMetadataFromContext(ctx),
        });
      }

      return ctx.send({
        jwt: getService(strapi, 'jwt').issue({ id: user.id }),
        user: await sanitizeUser(strapi, user, ctx),
      });
    }

    // Connect the user with the third-party provider.
    try {
      const grantResponse = _.get(ctx, 'session.grant.response');

      if (!grantResponse) {
        throw new ApplicationError('OAuth authentication requires a completed provider session');
      }

      const user = await getService(strapi, 'providers').connect(provider, grantResponse, {
        grantResponse,
      });

      if (user.blocked) {
        throw new ForbiddenError('Your account has been blocked by an administrator');
      }

      const mode = strapi.config.get<string>(
        'plugin::users-permissions.jwtManagement',
        'legacy-support'
      );
      if (mode === 'refresh') {
        return await sendRefreshAuthResponse(strapi, ctx, user, {
          metadata: buildSessionMetadataFromContext(ctx),
        });
      }

      return ctx.send({
        jwt: getService(strapi, 'jwt').issue({ id: user.id }),
        user: await sanitizeUser(strapi, user, ctx),
      });
    } catch (error) {
      throw new ApplicationError(error instanceof Error ? error.message : undefined);
    }
  },

  async changePassword(ctx: Context) {
    if (!ctx.state.user) {
      throw new ApplicationError('You must be authenticated to reset your password');
    }

    const validations = strapi.config.get<PasswordValidationRules>(
      'plugin::users-permissions.validationRules'
    );

    const { currentPassword, password } = await validateChangePasswordBody(
      ctx.request.body,
      validations
    );

    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });

    const validPassword = await getService(strapi, 'user').validatePassword(
      currentPassword,
      user.password
    );

    if (!validPassword) {
      throw new ValidationError('The provided current password is invalid');
    }

    if (currentPassword === password) {
      throw new ValidationError('Your new password must be different than your current password');
    }

    await getService(strapi, 'user').edit(user.id, { password });

    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );
    if (mode === 'refresh') {
      return reissueTokensAfterPasswordChange(strapi, ctx, user);
    }

    return ctx.send({
      jwt: getService(strapi, 'jwt').issue({ id: user.id }),
      user: await sanitizeUser(strapi, user, ctx),
    });
  },

  async resetPassword(ctx: Context) {
    const validations = strapi.config.get<PasswordValidationRules>(
      'plugin::users-permissions.validationRules'
    );

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

    await getService(strapi, 'user').edit(user.id, {
      resetPasswordToken: null,
      password,
    });

    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );
    if (mode === 'refresh') {
      return reissueTokensAfterPasswordChange(strapi, ctx, user);
    }

    return ctx.send({
      jwt: getService(strapi, 'jwt').issue({ id: user.id }),
      user: await sanitizeUser(strapi, user, ctx),
    });
  },
  async refresh(ctx: Context) {
    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );
    if (mode !== 'refresh') {
      return ctx.notFound();
    }

    const upSessions = strapi.config.get<SessionsConfig>('plugin::users-permissions.sessions', {});
    const cookieName = upSessions?.cookie?.name || 'strapi_up_refresh';

    // Check for refresh token in cookie first (if httpOnly is configured), then in body
    let refreshToken = ctx.cookies.get(cookieName);
    if (!refreshToken) {
      refreshToken = ctx.request.body?.refreshToken;
    }

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

    const requestHttpOnly = ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly';
    if (upSessions?.httpOnly || requestHttpOnly) {
      const isProduction = process.env.NODE_ENV === 'production';
      ctx.cookies.set(
        cookieName,
        rotation.token,
        buildRefreshCookieOptions(upSessions, isProduction)
      );
      return ctx.send({ jwt: result.token });
    }
    return ctx.send({ jwt: result.token, refreshToken: rotation.token });
  },
  async logout(ctx: Context) {
    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );
    if (mode !== 'refresh') {
      return ctx.notFound();
    }

    if (!ctx.state.user) {
      return ctx.unauthorized('Missing authentication');
    }

    const userId = String(ctx.state.user.id);
    const upSessions = strapi.config.get<SessionsConfig>('plugin::users-permissions.sessions', {});
    const body = ctx.request.body || {};
    const scope = typeof body.scope === 'string' ? body.scope : undefined;
    const deviceId = extractDeviceId(body);

    try {
      await revokeLogoutSessions(strapi, ctx, userId, { scope, deviceId, body });
    } catch (err) {
      strapi.log.error('UP logout failed', err);
    }

    const requestHttpOnly = ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly';
    if (upSessions?.httpOnly || requestHttpOnly) {
      const cookieName = upSessions.cookie?.name || 'strapi_up_refresh';
      const isProduction = process.env.NODE_ENV === 'production';

      const { maxAge: _maxAge, ...cookieOptions } = buildRefreshCookieOptions(
        upSessions,
        isProduction
      );

      ctx.cookies.set(cookieName, '', { ...cookieOptions, expires: new Date(0) });
    }
    return ctx.send({ ok: true });
  },
  async getSessions(ctx: Context) {
    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );
    if (mode !== 'refresh') {
      return ctx.notFound();
    }

    if (!ctx.state.user) {
      return ctx.unauthorized('Missing authentication');
    }

    const currentSessionId = ctx.state.session?.id;
    const sessions = await strapi
      .sessionManager('users-permissions')
      .listSessions(String(ctx.state.user.id));

    const data = sortSessionsForDisplay(
      sessions.map((session) => sanitizeSessionEntry(session, currentSessionId))
    );

    return ctx.send({ data });
  },
  async revokeSession(ctx: Context) {
    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );
    if (mode !== 'refresh') {
      return ctx.notFound();
    }

    if (!ctx.state.user) {
      return ctx.unauthorized('Missing authentication');
    }

    const { sessionId } = ctx.params;
    const revoked = await strapi
      .sessionManager('users-permissions')
      .revokeSessionById(String(ctx.state.user.id), sessionId);

    if (!revoked) {
      return ctx.notFound('Session not found');
    }

    return ctx.send({ data: {} });
  },
  async connect(ctx: Context, next: Next) {
    const providers = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get()) as GrantConfig;

    const [requestPath] = ctx.request.url.split('?');
    const provider = requestPath.split('/connect/')[1].split('/')[0];

    if (!_.get(providers, [provider, 'enabled'])) {
      throw new ApplicationError('This provider is disabled');
    }

    if (!strapi.config.server.url.startsWith('http')) {
      strapi.log.warn(
        'You are using a third party provider for login. Make sure to set an absolute url in config/server.js. More info here: https://docs.strapi.io/developer-docs/latest/plugins/users-permissions.html#setting-up-the-server-url'
      );
    }

    const queryCustomCallback = _.get(ctx, 'query.callback');
    const dynamicSessionCallback = _.get(ctx, 'session.grant.dynamic.callback');
    const customCallback = queryCustomCallback ?? dynamicSessionCallback;

    if (customCallback !== undefined) {
      try {
        const { validate: validateCallback } = strapi.plugin('users-permissions').config<{
          validate: (callback: unknown, provider: ProviderSettings) => Promise<void>;
        }>('callback');

        await validateCallback(customCallback, providers[provider]);

        // Persist across the provider redirect round-trip (request state alone is lost).
        ctx.session = ctx.session || {};
        ctx.session.grant = ctx.session.grant || {};
        ctx.session.grant.dynamic = {
          ...ctx.session.grant.dynamic,
          callback: customCallback,
        };
        ctx.state.oauthConnect = { callback: customCallback };
      } catch {
        throw new ValidationError('Invalid callback URL provided', { callback: customCallback });
      }
    }

    const oauthConnect = createOAuthConnectMiddleware(strapi);

    return oauthConnect(ctx, next);
  },

  async forgotPassword(ctx: Context) {
    const { email } = await validateForgotPasswordBody(ctx.request.body);

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const emailSettings = (await pluginStore.get({ key: 'email' })) as EmailSettings;
    const advancedSettings = (await pluginStore.get({ key: 'advanced' })) as AdvancedSettings;

    // Find the user by email.
    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email: email.toLowerCase() } });

    if (!user || user.blocked) {
      return ctx.send({ ok: true });
    }

    // Generate random token.
    const userInfo = await sanitizeUser(strapi, user, ctx);

    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    const resetPasswordSettings = emailSettings.reset_password.options;
    const emailBody = await getService(strapi, 'users-permissions').template(
      resetPasswordSettings.message,
      {
        URL: advancedSettings.email_reset_password,
        SERVER_URL: strapi.config.get('server.absoluteUrl'),
        ADMIN_URL: strapi.config.get('admin.absoluteUrl'),
        USER: userInfo,
        TOKEN: resetPasswordToken,
      }
    );

    const emailObject = await getService(strapi, 'users-permissions').template(
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
    await getService(strapi, 'user').edit(user.id, { resetPasswordToken });

    // Send an email to the user.
    await strapi.plugin('email').service('email').send(emailToSend);

    ctx.send({ ok: true });
  },

  async register(ctx: Context) {
    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const settings = (await pluginStore.get({ key: 'advanced' })) as AdvancedSettings;

    if (!settings.allow_register) {
      throw new ApplicationError('Register action is currently disabled');
    }

    const { register } = strapi.config.get<{ register?: { allowedFields?: string[] } }>(
      'plugin::users-permissions'
    );
    const alwaysAllowedKeys = ['username', 'password', 'email'];

    // Note that we intentionally do not filter allowedFields to allow a project to explicitly accept private or other Strapi field on registration
    const allowedKeys = [
      ...alwaysAllowedKeys,
      ...(Array.isArray(register?.allowedFields) ? register.allowedFields : []),
    ].filter((field) => Boolean(field));

    // Check if there are any keys in requestBody that are not in allowedKeys
    const invalidKeys = Object.keys(ctx.request.body).filter((key) => !allowedKeys.includes(key));

    if (invalidKeys.length > 0) {
      // If there are invalid keys, throw an error
      throw new ValidationError(`Invalid parameters: ${invalidKeys.join(', ')}`);
    }

    const validations = strapi.config.get<PasswordValidationRules>(
      'plugin::users-permissions.validationRules'
    );
    const params = {
      ...(await validateRegisterBody(
        { ..._.pick(ctx.request.body, allowedKeys), provider: 'local' },
        validations
      )),
      provider: 'local',
    };

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

    const user = await getService(strapi, 'user').add(newUser);

    const sanitizedUser = await sanitizeUser(strapi, user, ctx);

    if (settings.email_confirmation) {
      try {
        await getService(strapi, 'user').sendConfirmationEmail(sanitizedUser);
      } catch (err) {
        strapi.log.error(err);
        throw new ApplicationError('Error sending confirmation email');
      }

      return ctx.send({ user: sanitizedUser });
    }

    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );
    if (mode === 'refresh') {
      const deviceId = extractDeviceId(ctx.request.body) || crypto.randomUUID();

      const refresh = await strapi
        .sessionManager('users-permissions')
        .generateRefreshToken(String(user.id), deviceId, {
          type: 'refresh',
          metadata: buildSessionMetadataFromContext(ctx),
        });

      const access = await strapi
        .sessionManager('users-permissions')
        .generateAccessToken(refresh.token);
      if ('error' in access) {
        throw new ApplicationError('Invalid credentials');
      }

      return ctx.send({ jwt: access.token, refreshToken: refresh.token, user: sanitizedUser });
    }

    const jwt = getService(strapi, 'jwt').issue(_.pick(user, ['id']));
    return ctx.send({ jwt, user: sanitizedUser });
  },

  async emailConfirmation(ctx: Context, next?: Next, returnUser?: boolean) {
    const { confirmation: confirmationToken } = await validateEmailConfirmationBody(ctx.query);

    const userService = getService(strapi, 'user');
    const jwtService = getService(strapi, 'jwt');

    const [user] = await userService.fetchAll({ filters: { confirmationToken } });

    if (!user) {
      throw new ValidationError('Invalid token');
    }

    await userService.edit(user.id, { confirmed: true, confirmationToken: null });

    if (returnUser) {
      ctx.send({
        jwt: jwtService.issue({ id: user.id }),
        user: await sanitizeUser(strapi, user, ctx),
      });
    } else {
      const settings = (await strapi
        .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
        .get()) as AdvancedSettings;

      ctx.redirect(settings.email_confirmation_redirection || '/');
    }
  },

  async sendEmailConfirmation(ctx: Context) {
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

    await getService(strapi, 'user').sendConfirmationEmail(user);

    ctx.send({
      email: user.email,
      sent: true,
    });
  },
});
