import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { PROFILE_UID, ROLE_UID, USER_UID } from '../../../constants';
import { applyGraphqlTypeNames, graphqlTypeNames } from '../names';

describe('graphqlTypeNames', () => {
  it('names the user and role types UsersPermissions* with compat on and EndUser* with it off', () => {
    expect(graphqlTypeNames(true)).toEqual({
      user: { singular: 'UsersPermissionsUser', plural: 'UsersPermissionsUsers' },
      role: { singular: 'UsersPermissionsRole', plural: 'UsersPermissionsRoles' },
      profile: { singular: 'EndUserProfile', plural: 'EndUserProfiles' },
    });
    expect(graphqlTypeNames(false)).toEqual({
      user: { singular: 'EndUser', plural: 'EndUsers' },
      role: { singular: 'EndUserRole', plural: 'EndUserRoles' },
      profile: { singular: 'EndUserProfile', plural: 'EndUserProfiles' },
    });
  });
});

describe('applyGraphqlTypeNames', () => {
  const setup = () => {
    const schemas: Record<string, { pluginOptions: Record<string, unknown> }> = {
      [USER_UID]: { pluginOptions: { graphql: { typeName: { singular: 'EndUser' } }, i18n: {} } },
      [ROLE_UID]: { pluginOptions: {} },
      [PROFILE_UID]: { pluginOptions: { graphql: { typeName: { singular: 'EndUserProfile' } } } },
    };
    const strapi = { contentType: (uid: string) => schemas[uid] } as unknown as Core.Strapi;

    return { schemas, strapi };
  };

  it('sets the names of the mode on the user, the role and the profile, and keeps the other options', () => {
    const { schemas, strapi } = setup();

    applyGraphqlTypeNames(strapi, true);

    expect(schemas[USER_UID].pluginOptions).toEqual({
      graphql: { typeName: graphqlTypeNames(true).user },
      i18n: {},
    });
    expect(schemas[ROLE_UID].pluginOptions).toEqual({
      graphql: { typeName: graphqlTypeNames(true).role },
    });
    expect(schemas[PROFILE_UID].pluginOptions).toEqual({
      graphql: { typeName: graphqlTypeNames(true).profile },
    });
  });

  it('leaves the stock names alone with compat off', () => {
    const { schemas, strapi } = setup();

    applyGraphqlTypeNames(strapi, false);

    expect(schemas[ROLE_UID].pluginOptions).toEqual({});
    expect(schemas[USER_UID].pluginOptions.graphql).toEqual({ typeName: { singular: 'EndUser' } });
  });
});
