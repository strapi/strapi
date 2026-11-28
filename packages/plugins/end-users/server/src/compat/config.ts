import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';

const CONFIG = `plugin::${PLUGIN_ID}.compat`;

export type LegacyJwtAlgorithm = 'HS256' | 'HS384' | 'HS512';
export type SameSite = 'lax' | 'strict' | 'none';

export const LEGACY_JWT_ALGORITHMS: readonly LegacyJwtAlgorithm[] = ['HS256', 'HS384', 'HS512'];
export const SAME_SITE_VALUES: readonly SameSite[] = ['lax', 'strict', 'none'];

/** The name Users & Permissions gives the refresh cookie, so a front end keeps working */
export const DEFAULT_REFRESH_COOKIE_NAME = 'strapi_up_refresh';

/**
 * The `compat` group of `config/plugins.ts`, with every default filled in. This is the one place
 * that reads the raw keys: the rest of the compatibility code asks for this.
 */
export interface CompatConfig {
  usersPermissions: boolean;
  legacyJwt: { secret: string | null; until: Date | null; algorithm: LegacyJwtAlgorithm };
  refresh: {
    enabled: boolean;
    httpOnly: boolean;
    cookie: {
      name: string;
      secure: boolean;
      sameSite: SameSite;
      path: string;
      domain: string | null;
      maxAge: number | null;
    };
  };
  connect: { callbacks: Record<string, string> };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A date-only cut-off lasts until the end of that day in UTC, a full timestamp is taken as is */
const parseUntil = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value === '') {
    return null;
  }

  const date = new Date(DATE_ONLY.test(value) ? `${value}T23:59:59.999Z` : value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const isOneOf = <T extends string>(allowed: readonly T[], value: unknown): value is T =>
  allowed.includes(value as T);

const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

const callbacksOf = (value: unknown): Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
};

/**
 * Reads the compatibility settings. Each key is read on its own, so a project that sets only some
 * of a group gets the defaults for the rest. `cookie.secure` follows `NODE_ENV` unless it is set.
 */
export const readCompatConfig = (strapi: Core.Strapi): CompatConfig => {
  const read = (key: string) => strapi.config.get<unknown>(`${CONFIG}.${key}`);

  const algorithm = read('legacyJwt.algorithm');
  const sameSite = read('refresh.cookie.sameSite');
  const secure = read('refresh.cookie.secure');
  const maxAge = read('refresh.cookie.maxAge');
  const path = read('refresh.cookie.path');

  return {
    usersPermissions: read('usersPermissions') === true,
    legacyJwt: {
      secret: nonEmptyString(read('legacyJwt.secret')),
      until: parseUntil(read('legacyJwt.until')),
      algorithm: isOneOf(LEGACY_JWT_ALGORITHMS, algorithm) ? algorithm : 'HS256',
    },
    refresh: {
      enabled: read('refresh.enabled') === true,
      httpOnly: read('refresh.httpOnly') === true,
      cookie: {
        name: nonEmptyString(read('refresh.cookie.name')) ?? DEFAULT_REFRESH_COOKIE_NAME,
        secure: typeof secure === 'boolean' ? secure : process.env.NODE_ENV === 'production',
        sameSite: isOneOf(SAME_SITE_VALUES, sameSite) ? sameSite : 'lax',
        path: typeof path === 'string' && path !== '' ? path : '/',
        domain: nonEmptyString(read('refresh.cookie.domain')),
        maxAge: typeof maxAge === 'number' ? maxAge : null,
      },
    },
    connect: { callbacks: callbacksOf(read('connect.callbacks')) },
  };
};
