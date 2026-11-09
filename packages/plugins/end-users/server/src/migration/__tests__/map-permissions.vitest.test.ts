import { describe, expect, it } from 'vitest';

import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../bootstrap';
import { PROFILE_UID, ROLE_FIND_ACTION, ROLE_UID, USER_UID } from '../../constants';
import { mapRolePermissions } from '../map-permissions';
import type { PermissionMapContext } from '../map-permissions';

const UP = 'plugin::users-permissions';
const EU = 'plugin::end-users';

const context = (overrides: Partial<PermissionMapContext> = {}): PermissionMapContext => ({
  compat: true,
  contentTypes: {
    'api::note.note': { draftAndPublish: false },
    'api::post.post': { draftAndPublish: true },
  },
  fields: (uid, use) => [`${uid}:${use}`],
  isKnownAction: (action) => action === 'plugin::upload.content-api.upload',
  ...overrides,
});

const map = (actions: string[], roleType = 'custom', overrides = {}) =>
  mapRolePermissions(actions, roleType, context(overrides));

const find = (rows: ReturnType<typeof map>['rows'], action: string) =>
  rows.find((row) => row.action === action);

const SELF = [{ name: 'plugin::end-users.is-self' }];

describe('mapRolePermissions', () => {
  it('maps each user action and gives update and delete is-self', () => {
    const { rows, changed } = map([
      `${UP}.user.find`,
      `${UP}.user.findOne`,
      `${UP}.user.count`,
      `${UP}.user.create`,
      `${UP}.user.update`,
      `${UP}.user.destroy`,
    ]);

    expect(find(rows, `${EU}.user.find`)).toEqual({
      action: `${EU}.user.find`,
      subject: USER_UID,
      properties: { fields: [`${USER_UID}:read`] },
      conditions: [],
    });
    expect(find(rows, `${EU}.user.findOne`)?.properties).toEqual({ fields: [`${USER_UID}:read`] });
    expect(find(rows, `${EU}.user.count`)?.subject).toBe(USER_UID);
    expect(find(rows, `${EU}.user.create`)?.properties).toEqual({
      fields: [`${USER_UID}:write`],
    });
    expect(find(rows, `${EU}.user.update`)).toMatchObject({
      subject: USER_UID,
      properties: { fields: [`${USER_UID}:write`] },
      conditions: SELF,
    });
    expect(find(rows, `${EU}.user.delete`)).toMatchObject({ subject: USER_UID, conditions: SELF });
    expect(changed).toEqual([
      { action: `${UP}.user.update`, change: 'is-self' },
      { action: `${UP}.user.destroy`, change: 'is-self' },
    ]);
  });

  it('turns user.me into me.find and the own-profile reads, and user.update into the own-profile write', () => {
    const me = map([`${UP}.user.me`]).rows;

    expect(me.map((row) => row.action)).toEqual([
      `${EU}.me.find`,
      `${EU}.me.findProfile`,
      `${PROFILE_UID}.find`,
      `${PROFILE_UID}.findOne`,
    ]);
    expect(find(me, `${PROFILE_UID}.find`)).toMatchObject({
      subject: PROFILE_UID,
      conditions: [{ name: 'plugin::end-users.is-owner', params: { field: 'user' } }],
    });

    const update = map([`${UP}.user.update`], 'custom', {
      fields: (uid: string) => (uid === PROFILE_UID ? ['user', 'nickname'] : ['email']),
    }).rows;

    expect(find(update, `${EU}.me.updateProfile`)).toBeDefined();
    expect(find(update, `${PROFILE_UID}.update`)?.properties).toEqual({ fields: ['nickname'] });
  });

  it('keeps role.find as the grantable role read and drops the other role and permission actions', () => {
    const { rows, dropped } = map([
      `${UP}.role.find`,
      `${UP}.role.findOne`,
      `${UP}.role.createRole`,
      `${UP}.permissions.getPermissions`,
    ]);

    expect(rows).toEqual([
      { action: ROLE_FIND_ACTION, subject: ROLE_UID, properties: { fields: null }, conditions: [] },
    ]);
    expect(dropped).toEqual([
      { action: `${UP}.role.findOne`, reason: 'roles-api' },
      { action: `${UP}.role.createRole`, reason: 'roles-api' },
      { action: `${UP}.permissions.getPermissions`, reason: 'roles-api' },
    ]);
  });

  it('drops auth and connect actions', () => {
    const { rows, dropped } = map([`${UP}.auth.callback`, `${UP}.auth.register`, `${UP}.connect`]);

    expect(rows).toEqual([]);
    expect(dropped.map(({ reason }) => reason)).toEqual(['auth-route', 'auth-route', 'auth-route']);
  });

  it('drops user.count without compat', () => {
    const { rows, dropped } = map([`${UP}.user.count`], 'custom', { compat: false });

    expect(rows).toEqual([]);
    expect(dropped).toEqual([{ action: `${UP}.user.count`, reason: 'compat-off' }]);
  });

  it('gives api:: create and update explicit field lists and reads no list', () => {
    const { rows } = map([
      'api::note.note.find',
      'api::note.note.findOne',
      'api::note.note.create',
      'api::note.note.update',
      'api::note.note.delete',
    ]);

    expect(rows.map((row) => [row.action, row.subject, row.properties])).toEqual([
      ['api::note.note.find', 'api::note.note', { fields: null }],
      ['api::note.note.findOne', 'api::note.note', { fields: null }],
      ['api::note.note.create', 'api::note.note', { fields: ['api::note.note:write'] }],
      ['api::note.note.update', 'api::note.note', { fields: ['api::note.note:write'] }],
      ['api::note.note.delete', 'api::note.note', {}],
    ]);
  });

  it('notes that writes and draft reads change on a draft-and-publish type', () => {
    const { changed } = map([
      'api::post.post.find',
      'api::post.post.create',
      'api::note.note.find',
    ]);

    expect(changed).toEqual([
      { action: 'api::post.post.find', change: 'drafts' },
      { action: 'api::post.post.create', change: 'drafts' },
    ]);
  });

  it('keeps a custom action the application knows with no subject, and drops the rest', () => {
    const { rows, dropped } = map([
      'plugin::upload.content-api.upload',
      'api::gone.gone.find',
      `${UP}.user.whatever`,
    ]);

    expect(rows).toEqual([
      {
        action: 'plugin::upload.content-api.upload',
        subject: null,
        properties: {},
        conditions: [],
      },
    ]);
    expect(dropped.map(({ reason }) => reason)).toEqual(['unknown', 'unknown']);
    expect(
      map(['plugin::upload.content-api.upload'], 'custom', { isKnownAction: () => null }).rows
    ).toEqual([]);
  });

  it('adds the default Authenticated rows once and collapses a duplicated row', () => {
    const { rows } = map(
      [`${UP}.user.me`, `${UP}.user.me`, 'api::note.note.find', 'api::note.note.find'],
      'authenticated'
    );

    expect(rows.map((row) => row.action).sort((a, b) => a.localeCompare(b))).toEqual(
      [...DEFAULT_AUTHENTICATED_PERMISSIONS.map((row) => row.action), 'api::note.note.find'].sort(
        (a, b) => a.localeCompare(b)
      )
    );
    expect(find(rows, `${PROFILE_UID}.update`)?.properties).toEqual({
      fields: [`${PROFILE_UID}:write`],
    });
    // Other roles get no defaults
    expect(map([], 'public').rows).toEqual([]);
  });
});
