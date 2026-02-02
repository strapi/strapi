import type { Core } from '@strapi/types';
import passport from 'koa-passport';
import { getService } from '../../utils';
import utils from './utils';
import {
  REFRESH_COOKIE_NAME,
  buildCookieOptionsWithExpiry,
  getSessionManager,
  generateDeviceId,
} from '../../../../../shared/utils/session-auth';

const defaultConnectionError = () => new Error('Invalid connection payload');

export const authenticate: Core.MiddlewareHandler = async (ctx, next) => {
  const {
    params: { provider },
  } = ctx;
  const redirectUrls = utils.getPrefixedRedirectUrls();

  // @ts-expect-error - can not use null to authenticate
  return passport.authenticate(provider, null, async (error, profile) => {
    if (error || !profile || !profile.email) {
      if (error) {
        strapi.log.error(error);
      }

      strapi.eventHub.emit('admin.auth.error', {
        error: error || defaultConnectionError(),
        provider,
      });

      return ctx.redirect(redirectUrls.error);
    }

    const user = await getService('user').findOneByEmail(profile.email);
    const scenario = user ? existingUserScenario : nonExistingUserScenario;

    return scenario(ctx, next)(user || profile, provider);
  })(ctx, next);
};

const existingUserScenario: Core.MiddlewareHandler =
  (ctx, next) => async (user: any, provider: any) => {
    const redirectUrls = utils.getPrefixedRedirectUrls();

    if (!user.isActive) {
      strapi.eventHub.emit('admin.auth.error', {
        error: new Error(`Deactivated user tried to login (${user.id})`),
        provider,
      });
      return ctx.redirect(redirectUrls.error);
    }

    ctx.state.user = user;
    return next();
  };

const nonExistingUserScenario: Core.MiddlewareHandler =
  (ctx, next) => async (profile: any, provider: any) => {
    const { email, firstname, lastname, username } = profile;
    const redirectUrls = utils.getPrefixedRedirectUrls();
    const adminStore = await utils.getAdminStore();
    const { providers } = (await adminStore.get({ key: 'auth' })) as any;

    // We need at least the username or the firstname/lastname combination to register a new user
    const isMissingRegisterFields = !username && (!firstname || !lastname);

    if (!providers.autoRegister || !providers.defaultRole || isMissingRegisterFields) {
      strapi.eventHub.emit('admin.auth.error', { error: defaultConnectionError(), provider });
      return ctx.redirect(redirectUrls.error);
    }

    const defaultRole = await getService('role').findOne({ id: providers.defaultRole });

    // If the default role has been misconfigured, redirect with an error
    if (!defaultRole) {
      strapi.eventHub.emit('admin.auth.error', { error: defaultConnectionError(), provider });
      return ctx.redirect(redirectUrls.error);
    }

    // Register a new user with the information given by the provider and login with it
    ctx.state.user = await getService('user').create({
      email,
      username,
      firstname,
      lastname,
      roles: [defaultRole.id],
      isActive: true,
      registrationToken: null,
    });

    strapi.eventHub.emit('admin.auth.autoRegistration', {
      user: ctx.state.user,
      provider,
    });

    return next();
  };

export const redirectWithAuth: Core.MiddlewareHandler = async (ctx) => {
  const {
    params: { provider },
  } = ctx;
  const redirectUrls = utils.getPrefixedRedirectUrls();
  const { user } = ctx.state;

  try {
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      strapi.log.error('SessionManager not available for SSO authentication');
      return ctx.redirect(redirectUrls.error);
    }

    const userId = String(user.id);
    const deviceId = generateDeviceId();

    const { token: refreshToken, absoluteExpiresAt } = await sessionManager(
      'admin'
    ).generateRefreshToken(userId, deviceId, {
      type: 'refresh',
    });

    const cookieOptions = buildCookieOptionsWithExpiry('refresh', absoluteExpiresAt);
    ctx.cookies.set(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

    const accessResult = await sessionManager('admin').generateAccessToken(refreshToken);
    if ('error' in accessResult) {
      strapi.log.error('Failed to generate access token for SSO user');
      return ctx.redirect(redirectUrls.error);
    }

    const { token: accessToken } = accessResult;

    const configuredSecure = strapi.config.get('admin.auth.cookie.secure');
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = typeof configuredSecure === 'boolean' ? configuredSecure : isProduction;

    const domain: string | undefined = strapi.config.get('admin.auth.domain');
    ctx.cookies.set('jwtToken', accessToken, {
      httpOnly: false,
      secure: isSecure,
      overwrite: true,
      domain,
    });

    const sanitizedUser = getService('user').sanitizeUser(user);
    strapi.eventHub.emit('admin.auth.success', { user: sanitizedUser, provider });

    ctx.redirect(redirectUrls.success);
  } catch (error) {
    strapi.log.error('SSO authentication failed during token generation', error);
    strapi.eventHub.emit('admin.auth.error', {
      error: error instanceof Error ? error : new Error('Unknown SSO error'),
      provider,
    });
    return ctx.redirect(redirectUrls.error);
  }
};

export default {
  authenticate,
  redirectWithAuth,
};
