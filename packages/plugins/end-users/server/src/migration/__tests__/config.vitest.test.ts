import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import config from '../../config';
import { isCheckMode, readMigrationConfig } from '../config';

const strapiWith = (values: Record<string, unknown>) =>
  ({
    config: { get: (key: string) => values[key.replace('plugin::end-users.migration.', '')] },
  }) as unknown as Core.Strapi;

describe('readMigrationConfig', () => {
  it('fills the migration defaults: not asked for, keep-oldest, no registration fields, no rollback', () => {
    const defaults = (config.default as (args: { env: unknown }) => Record<string, unknown>)({
      env: Object.assign(() => undefined, { bool: () => false }),
    });

    expect(defaults.migration).toEqual({
      fromUsersPermissions: null,
      duplicates: 'keep-oldest',
      registrationFields: null,
      rollback: false,
    });
    expect(readMigrationConfig(strapiWith({}))).toEqual({
      fromUsersPermissions: null,
      duplicates: 'keep-oldest',
      registrationFields: null,
      rollback: false,
    });
  });

  it('reads what is set, and takes the default for a value of the wrong kind', () => {
    expect(
      readMigrationConfig(
        strapiWith({
          fromUsersPermissions: true,
          duplicates: 'abort',
          registrationFields: ['company'],
          rollback: true,
        })
      )
    ).toEqual({
      fromUsersPermissions: true,
      duplicates: 'abort',
      registrationFields: ['company'],
      rollback: true,
    });
    expect(
      readMigrationConfig(
        strapiWith({
          fromUsersPermissions: 'yes',
          duplicates: 'merge',
          registrationFields: [1],
          rollback: 'true',
        })
      )
    ).toEqual({
      fromUsersPermissions: null,
      duplicates: 'keep-oldest',
      registrationFields: null,
      rollback: false,
    });
  });

  it('is in check mode only for "check"', () => {
    expect(isCheckMode(strapiWith({ fromUsersPermissions: 'check' }))).toBe(true);
    expect(isCheckMode(strapiWith({ fromUsersPermissions: true }))).toBe(false);
    expect(isCheckMode(strapiWith({}))).toBe(false);
  });
});
