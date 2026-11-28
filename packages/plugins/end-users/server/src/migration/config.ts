import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';

const CONFIG = `plugin::${PLUGIN_ID}.migration`;

/**
 * The `migration` group of `config/plugins.ts`, with every default filled in. All four keys are
 * config: they are read-only in the admin, and a change reaches production through a deploy.
 *
 * - `fromUsersPermissions`: `true` runs the migration from Users & Permissions when the
 *   application starts, `'check'` only reports what it would do (dormant: nothing is created or
 *   written but the report), `false` and `null` (not set) leave it alone.
 * - `duplicates`: what to do with users who share an email address or a username once case is
 *   ignored: keep the oldest and report the rest, or stop.
 * - `registrationFields`: the sign-up fields to keep, `null` to decide from the profile.
 * - `rollback`: undo the migration on the next start.
 */
export interface MigrationConfig {
  fromUsersPermissions: boolean | 'check' | null;
  duplicates: 'keep-oldest' | 'abort';
  registrationFields: string[] | null;
  rollback: boolean;
}

export const DUPLICATES_MODES = ['keep-oldest', 'abort'] as const;

/** At most this many registration fields, each at most `MAX_FIELD_LENGTH` characters */
export const MAX_REGISTRATION_FIELDS = 100;
export const MAX_FIELD_LENGTH = 255;

export const readMigrationConfig = (strapi: Core.Strapi): MigrationConfig => {
  const read = (key: string) => strapi.config.get<unknown>(`${CONFIG}.${key}`);

  const from = read('fromUsersPermissions');
  const duplicates = read('duplicates');
  const fields = read('registrationFields');

  return {
    fromUsersPermissions: typeof from === 'boolean' || from === 'check' ? from : null,
    duplicates: duplicates === 'abort' ? 'abort' : 'keep-oldest',
    registrationFields:
      Array.isArray(fields) && fields.every((field) => typeof field === 'string')
        ? (fields as string[])
        : null,
    rollback: read('rollback') === true,
  };
};

/** The dormant mode: the check only, no table, route or write besides the report */
export const isCheckMode = (strapi: Core.Strapi): boolean =>
  readMigrationConfig(strapi).fromUsersPermissions === 'check';
