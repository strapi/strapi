import { describe, expect, it } from 'vitest';
import type { Database } from '@strapi/database';

import { leftoverColumns, reverseAdminAction, upRoleType } from '../rollback';

const UP = 'plugin::users-permissions';
const EU = 'plugin::end-users';

describe('reverseAdminAction', () => {
  it('maps end-users admin actions back and leaves the email templates read alone', () => {
    expect(reverseAdminAction(`${EU}.roles.read`)).toBe(`${UP}.roles.read`);
    expect(reverseAdminAction(`${EU}.roles.delete`)).toBe(`${UP}.roles.delete`);
    expect(reverseAdminAction(`${EU}.providers.update`)).toBe(`${UP}.providers.update`);
    expect(reverseAdminAction(`${EU}.settings.read`)).toBe(`${UP}.advanced-settings.read`);
    expect(reverseAdminAction(`${EU}.settings.update`)).toBe(`${UP}.advanced-settings.update`);
    expect(reverseAdminAction('plugin::email.templates.read')).toBeNull();
    expect(reverseAdminAction(`${EU}.something.else`)).toBeNull();
  });
});

describe('upRoleType', () => {
  it('builds a role type from the name and suffixes a clash', () => {
    const taken = new Set<string>(['public', 'authenticated']);

    expect(upRoleType('Content Editors', taken)).toBe('content_editors');

    taken.add('content_editors');

    expect(upRoleType('Content Editors', taken)).toBe('content_editors_2');
    expect(upRoleType('  Wéb / Team! ', taken)).toBe('web_team');
    expect(upRoleType('!!!', taken)).toBe('role');
  });
});

describe('leftoverColumns', () => {
  const db = {
    metadata: {
      values: () => [
        {
          tableName: 'eu_users',
          attributes: {
            id: { type: 'increments', columnName: 'id' },
            email: { type: 'string', columnName: 'email' },
            createdBy: { type: 'relation', joinColumn: { name: 'created_by_id' } },
            roles: { type: 'relation', joinTable: { name: 'eu_users_roles_lnk' } },
          },
        },
      ],
    },
  } as unknown as Database;

  it('lists the columns a table holds that its model does not declare', () => {
    expect(
      leftoverColumns(db, 'eu_users', ['id', 'email', 'created_by_id', 'company', 'password'])
    ).toEqual(['company', 'password']);
  });

  it('lists nothing for a table no model owns', () => {
    expect(leftoverColumns(db, 'eu_stg_1', ['id', 'anything'])).toEqual([]);
  });
});
