import { describe, expect, it } from 'vitest';

import { findSelfWritableWarnings } from '../selfWritableWarnings';

import type { ConditionListItem } from '../../../../../../shared/contracts/conditions';
import type { PermissionRow } from '../../../../../../shared/contracts/permissions';

const USER = 'plugin::end-users.user';
const PROFILE = 'plugin::end-users.profile';

const condition = (name: string, reads: string[]) =>
  ({ name, displayName: name, reads }) as ConditionListItem;

const row = (action: string, fields?: string[] | null): PermissionRow => ({
  action,
  subject: null,
  properties: fields === undefined ? {} : { fields },
  conditions: [],
});

describe('findSelfWritableWarnings', () => {
  it('warns when a create grant lets users write a field a condition reads', () => {
    const warnings = findSelfWritableWarnings(
      [condition('pro', ['profile.plan'])],
      [],
      [row(`${PROFILE}.create`, ['plan'])]
    );

    expect(warnings).toEqual([{ condition: 'pro', displayName: 'pro', field: 'profile.plan' }]);
  });

  it('warns for a user-type field, but not for the ones every user can already write', () => {
    const warnings = findSelfWritableWarnings(
      [condition('adult', ['user.age', 'user.name', 'user.preferredLocale'])],
      [],
      [row(`${USER}.update`)]
    );

    expect(warnings).toEqual([{ condition: 'adult', displayName: 'adult', field: 'user.age' }]);
  });

  it('warns when the field list changes from one that left the field out to every field', () => {
    const conditions = [condition('pro', ['profile.plan'])];

    expect(
      findSelfWritableWarnings(
        conditions,
        [row(`${PROFILE}.update`, ['bio'])],
        [row(`${PROFILE}.update`, null)]
      )
    ).toEqual([{ condition: 'pro', displayName: 'pro', field: 'profile.plan' }]);

    // A list that already held the field is not asked about again
    expect(
      findSelfWritableWarnings(
        conditions,
        [row(`${PROFILE}.update`, ['plan'])],
        [row(`${PROFILE}.update`, null)]
      )
    ).toEqual([]);
  });

  it('does not warn for a grant of another field or another action', () => {
    expect(
      findSelfWritableWarnings(
        [condition('pro', ['profile.plan'])],
        [],
        [row(`${PROFILE}.update`, ['bio']), row(`${PROFILE}.find`)]
      )
    ).toEqual([]);
  });
});
