import type { Core } from '@strapi/types';

import type { CompatConfig } from './config';

/** The origin Users & Permissions registers its tokens under, so a token it minted still verifies. */
export const LEGACY_ORIGIN = 'users-permissions';

/** Users & Permissions' own default lifespans, in seconds. */
const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;

export const LEGACY_LIFESPANS = {
  accessTokenLifespan: 10 * MINUTE,
  maxRefreshTokenLifespan: 30 * DAY,
  idleRefreshTokenLifespan: 14 * DAY,
  maxSessionLifespan: DAY,
  idleSessionLifespan: 2 * 60 * MINUTE,
} as const;

/**
 * Defines the `users-permissions` origin on core's session manager, with the secret and algorithm
 * of the tokens Users & Permissions issued: the legacy secret when one is configured, the admin's
 * secret otherwise (what Users & Permissions falls back to).
 */
export const defineLegacyOrigin = (strapi: Core.Strapi, cfg: CompatConfig): void => {
  const { algorithm } = cfg.legacyJwt;

  strapi.sessionManager.defineOrigin(LEGACY_ORIGIN, {
    jwtSecret: cfg.legacyJwt.secret ?? strapi.config.get<string>('admin.auth.secret'),
    ...LEGACY_LIFESPANS,
    algorithm,
    jwtOptions: { algorithm },
  });
};
