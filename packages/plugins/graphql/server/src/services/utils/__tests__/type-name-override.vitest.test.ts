import { describe, expect, it } from 'vitest';

import createNaming from '../naming';

const naming = createNaming({ strapi: { components: {} } } as any);

const userCt = {
  uid: 'plugin::end-users.user',
  modelType: 'contentType',
  kind: 'collectionType',
  plugin: 'end-users',
  modelName: 'user',
  info: { singularName: 'user', pluralName: 'users' },
  attributes: {},
} as any;

const overridden = (typeName: unknown) =>
  ({ ...userCt, pluginOptions: { graphql: { typeName } } }) as any;

describe('getTypeName', () => {
  it('prefixes the name of a plugin type with the plugin, as it always did', () => {
    expect(naming.getTypeName(userCt)).toBe('EndUsersUser');
    expect(naming.getTypeName(userCt, { plurality: 'plural' })).toBe('EndUsersUsers');
  });

  it('is named by the override, with no plugin prefix, in each plurality', () => {
    const ct = overridden({ singular: 'EndUser', plural: 'EndUsers' });

    expect(naming.getTypeName(ct)).toBe('EndUser');
    expect(naming.getTypeName(ct, { plurality: 'plural' })).toBe('EndUsers');
  });

  it('ignores an override that is not a name, per plurality', () => {
    expect(naming.getTypeName(overridden({ singular: '', plural: 'EndUsers' }))).toBe(
      'EndUsersUser'
    );
    expect(naming.getTypeName(overridden({ singular: 'EndUser' }), { plurality: 'plural' })).toBe(
      'EndUsersUsers'
    );
    expect(naming.getTypeName(overridden('EndUser'))).toBe('EndUsersUser');
    expect(naming.getTypeName(overridden(null))).toBe('EndUsersUser');
  });

  it('leaves a type without the option alone, whatever else its plugin options hold', () => {
    const ct = { ...userCt, pluginOptions: { i18n: { localized: false } } };

    expect(naming.getTypeName(ct)).toBe('EndUsersUser');
  });
});

describe('the names derived from an overridden type name', () => {
  const ct = overridden({ singular: 'EndUser', plural: 'EndUsers' });

  it('builds every name from the override', () => {
    expect([
      naming.getFindQueryName(ct),
      naming.getFindOneQueryName(ct),
      naming.getCreateMutationTypeName(ct),
    ]).toEqual(['endUsers', 'endUser', 'createEndUser']);
  });

  it('builds the mutations, input, filters, entity and response names from it too', () => {
    expect(naming.getUpdateMutationTypeName(ct)).toBe('updateEndUser');
    expect(naming.getDeleteMutationTypeName(ct)).toBe('deleteEndUser');
    expect(naming.getFindConnectionQueryName(ct)).toBe('endUsers_connection');
    expect(naming.getContentTypeInputName(ct)).toBe('EndUserInput');
    expect(naming.getFiltersInputTypeName(ct)).toBe('EndUserFiltersInput');
    expect(naming.getEntityName(ct)).toBe('EndUserEntity');
    expect(naming.getEntityResponseCollectionName(ct)).toBe('EndUserEntityResponseCollection');
    expect(naming.getRelationResponseCollectionName(ct)).toBe('EndUserRelationResponseCollection');
    expect(naming.getMorphRelationTypeName(ct, 'target')).toBe('EndUserTargetMorph');
    expect(naming.getDynamicZoneName(ct, 'blocks')).toBe('EndUserBlocksDynamicZone');
  });
});

describe('the names derived from the Users & Permissions type names', () => {
  const role = {
    ...userCt,
    uid: 'plugin::end-users.role',
    modelName: 'role',
    info: { singularName: 'role', pluralName: 'roles' },
    pluginOptions: {
      graphql: { typeName: { singular: 'UsersPermissionsRole', plural: 'UsersPermissionsRoles' } },
    },
  } as any;

  it('names the connection, the filters and the relation types other types point at from the override', () => {
    expect(naming.getFindConnectionQueryName(role)).toBe('usersPermissionsRoles_connection');
    expect(naming.getFiltersInputTypeName(role)).toBe('UsersPermissionsRoleFiltersInput');
    expect(naming.getRelationResponseCollectionName(role)).toBe(
      'UsersPermissionsRoleRelationResponseCollection'
    );
    expect(naming.getContentTypeInputName(role)).toBe('UsersPermissionsRoleInput');
  });
});
