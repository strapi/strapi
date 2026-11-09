import { attributeNaming } from '@strapi/database';
import type { Database } from '@strapi/database';
import { describe, expect, it } from 'vitest';

import { RENAMED, planStaging, stagingName, upJoinTableName, upLinkColumn } from '../tables';

const db = { metadata: { naming: attributeNaming } } as unknown as Database;

describe('upJoinTableName', () => {
  it('names a user-owned link table as the metadata layer does, shortened past the identifier limit', () => {
    expect(upJoinTableName(db, 'role')).toBe('up_users_role_lnk');
    expect(upJoinTableName(db, 'favorites')).toBe('up_users_favorites_lnk');

    const long = upJoinTableName(
      db,
      'a_very_long_attribute_name_that_goes_past_the_limit_for_names'
    );

    expect(long.length).toBeLessThanOrEqual(55);
    expect(long.endsWith('_lnk')).toBe(true);
    expect(long.startsWith('up_users_')).toBe(true);
  });
});

describe('staging', () => {
  it('numbers from 1 and names the tables eu_stg_<n>', () => {
    expect(stagingName(3)).toBe('eu_stg_3');
    expect(RENAMED.up_users).toBe('eu_users');
  });

  it('stages every up_ table but the renamed ones, in name order', () => {
    expect(
      planStaging(
        ['up_users', 'up_users_cmps', 'up_permissions', 'up_roles', 'up_users_role_lnk', 'other'],
        {},
        []
      )
    ).toEqual({ eu_stg_1: 'up_permissions', eu_stg_2: 'up_users_cmps' });
  });

  it('keeps the numbers it already gave and skips ones that are taken', () => {
    expect(
      planStaging(['up_users_cmps', 'up_permissions'], { eu_stg_1: 'up_permissions' }, [
        'eu_stg_1',
        'eu_stg_2',
      ])
    ).toEqual({ eu_stg_3: 'up_users_cmps' });
  });
});

describe('upLinkColumn', () => {
  const link = (inverse: string, order: string) => ({
    joinColumn: { name: 'profile_id' },
    inverseJoinColumn: { name: inverse },
    orderColumnName: order,
    inverseOrderColumnName: 'profile_order',
  });

  it('maps a relation to another type onto the user side of the old link table', () => {
    const l = link('organization_id', 'organization_order');

    expect(upLinkColumn(l, 'profile_id', 'manyToMany')).toBe('user_id');
    expect(upLinkColumn(l, 'organization_id', 'manyToMany')).toBe('organization_id');
    expect(upLinkColumn(l, 'organization_order', 'manyToMany')).toBe('organization_order');
    expect(upLinkColumn(l, 'profile_order', 'manyToMany')).toBe('user_order');
  });

  it('maps a relation to the user itself onto user_id and inv_user_id, never user_id twice', () => {
    const l = link('user_id', 'user_order');

    expect(upLinkColumn(l, 'profile_id', 'manyToMany')).toBe('user_id');
    expect(upLinkColumn(l, 'user_id', 'manyToMany')).toBe('inv_user_id');
    expect(upLinkColumn(l, 'user_order', 'manyToMany')).toBe('user_order');
    expect(upLinkColumn(l, 'profile_order', 'manyToMany')).toBe('inv_user_order');
    expect(upLinkColumn(l, 'profile_order', 'oneToMany')).toBe('user_order');
  });

  it('does the same for a type that is also called user, like the admin user an assignee points at', () => {
    const l = { joinColumn: { name: 'profile_id' }, inverseJoinColumn: { name: 'user_id' } };

    expect(upLinkColumn(l, 'profile_id', 'oneToOne')).toBe('user_id');
    expect(upLinkColumn(l, 'user_id', 'oneToOne')).toBe('inv_user_id');
  });
});
