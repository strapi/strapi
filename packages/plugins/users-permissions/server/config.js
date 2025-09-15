'use strict';

const {
  DEFAULT_ACCESS_TOKEN_LIFESPAN,
  DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN,
  DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN,
  DEFAULT_MAX_SESSION_LIFESPAN,
  DEFAULT_IDLE_SESSION_LIFESPAN,
} = require('./services/constants');

module.exports = {
  default: ({ env }) => ({
    jwtSecret: env('JWT_SECRET'),
    jwt: {
      expiresIn: '30d',
    },
    /**
     * JWT management mode for the Content API authentication
     * - "legacy-support": use plugin JWTs (backward compatible)
     * - "refresh": use SessionManager (access/refresh tokens)
     */
    jwtManagement: env('UP_JWT_MANAGEMENT', 'legacy-support'),
    sessions: {
      accessTokenLifespan: env.int('UP_SESSIONS_ACCESS_TTL', DEFAULT_ACCESS_TOKEN_LIFESPAN),
      maxRefreshTokenLifespan: env.int(
        'UP_SESSIONS_MAX_REFRESH_TTL',
        DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN
      ),
      idleRefreshTokenLifespan: env.int(
        'UP_SESSIONS_IDLE_REFRESH_TTL',
        DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN
      ),
      maxSessionLifespan: env.int('UP_SESSIONS_MAX_SESSION_TTL', DEFAULT_MAX_SESSION_LIFESPAN),
      idleSessionLifespan: env.int('UP_SESSIONS_IDLE_SESSION_TTL', DEFAULT_IDLE_SESSION_LIFESPAN),
      httpOnly: env.bool('UP_SESSIONS_HTTPONLY', false),
      cookie: {
        name: env('UP_SESSIONS_COOKIE_NAME', 'strapi_up_refresh'),
        sameSite: env('UP_SESSIONS_COOKIE_SAMESITE', 'lax'),
        path: env('UP_SESSIONS_COOKIE_PATH', '/'),
        domain: env('UP_SESSIONS_COOKIE_DOMAIN'),
        secure: env.bool('UP_SESSIONS_COOKIE_SECURE', process.env.NODE_ENV === 'production'),
      },
    },
    ratelimit: {
      interval: 60000,
      max: 10,
    },
    layout: {
      user: {
        actions: {
          create: 'contentManagerUser.create', // Use the User plugin's controller.
          update: 'contentManagerUser.update',
        },
      },
    },
    callback: {
      validate(callback, provider) {
        let uCallback;
        let uProviderCallback;

        try {
          uCallback = new URL(callback);
          uProviderCallback = new URL(provider.callback);
        } catch {
          throw new Error('The callback is not a valid URL');
        }

        // Make sure the different origin matches
        if (uCallback.origin !== uProviderCallback.origin) {
          throw new Error(
            `Forbidden callback provided: origins don't match. Please verify your config.`
          );
        }

        // Make sure the different pathname matches
        if (uCallback.pathname !== uProviderCallback.pathname) {
          throw new Error(
            `Forbidden callback provided: pathname don't match. Please verify your config.`
          );
        }

        // NOTE: We're not checking the search parameters on purpose to allow passing different states
      },
    },
  }),
  validator() {},
};
