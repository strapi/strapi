import crypto from 'crypto';
import _ from 'lodash';
import type { Core } from '@strapi/types';

const defaultJwtOptions = { expiresIn: '30d' };

const getTokenOptions = () => {
  const { options, secret } = strapi.config.get<Core.Config.Admin['auth']>(
    'admin.auth',
    {} as Core.Config.Admin['auth']
  );

  // Check for new sessions.options configuration
  const sessionsOptions = strapi.config.get('admin.auth.sessions.options', {});

  // Merge with legacy options for backward compatibility
  const mergedOptions = _.merge({}, defaultJwtOptions, options, sessionsOptions);

  return {
    secret,
    options: mergedOptions,
  };
};

/**
 * Create a random token
 */
const createToken = (): string => {
  return crypto.randomBytes(20).toString('hex');
};

const checkSecretIsDefined = () => {
  if (strapi.config.get('admin.serveAdminPanel') && !strapi.config.get('admin.auth.secret')) {
    throw new Error(
      `Missing auth.secret. Please set auth.secret in config/admin.js (ex: you can generate one using Node with \`crypto.randomBytes(16).toString('base64')\`).
For security reasons, prefer storing the secret in an environment variable and read it in config/admin.js. See https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#configuration-using-environment-variables.`
    );
  }
};

export { createToken, getTokenOptions, checkSecretIsDefined };

/**
 * Convert an expiresIn value (string or number) into seconds.
 * Supported formats:
 * - number: treated as seconds
 * - numeric string (e.g. "180"): treated as seconds
 * - shorthand string: "Xs", "Xm", "Xh", "Xd", "Xw" (case-insensitive)
 * Returns undefined when value is not set or invalid.
 */
export const expiresInToSeconds = (expiresIn: unknown): number | undefined => {
  if (expiresIn == null) return undefined;

  // Numeric input => seconds
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
    return Math.max(0, Math.floor(expiresIn));
  }

  if (typeof expiresIn !== 'string') return undefined;

  const value = expiresIn.trim().toLowerCase();

  // Pure numeric string => seconds
  if (/^\d+$/.test(value)) {
    const seconds = Number.parseInt(value, 10);
    return Number.isFinite(seconds) ? Math.max(0, seconds) : undefined;
  }

  // Shorthand formats (s, m, h, d, w)
  const match = value.match(/^(\d+)\s*(ms|s|m|h|d|w)$/i);
  if (!match) return undefined;

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount)) return undefined;

  const unit = match[2];
  switch (unit) {
    case 'ms':
      return Math.max(0, Math.floor(amount / 1000));
    case 's':
      return Math.max(0, amount);
    case 'm':
      return Math.max(0, amount * 60);
    case 'h':
      return Math.max(0, amount * 60 * 60);
    case 'd':
      return Math.max(0, amount * 24 * 60 * 60);
    case 'w':
      return Math.max(0, amount * 7 * 24 * 60 * 60);
    default:
      return undefined;
  }
};
