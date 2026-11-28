import { describe, expect, it } from 'vitest';

import { assertOneWayRelations } from '../../boot-checks';
import { USER_UID } from '../../constants';
import profile from '../profile';
import contentTypes from '..';

const { schema } = profile;

describe('the profile content type', () => {
  it('is shipped by the plugin, with the role and the permission', () => {
    expect(Object.keys(contentTypes).sort()).toEqual(['permission', 'profile', 'role']);
  });

  it('is `eu_profiles`, without draft and publish or localization', () => {
    expect(schema).toMatchObject({
      kind: 'collectionType',
      collectionName: 'eu_profiles',
      info: { singularName: 'profile', pluralName: 'profiles', displayName: 'Profile' },
      options: { draftAndPublish: false },
      pluginOptions: { i18n: { localized: false } },
    });
  });

  it('is `EndUserProfile` on GraphQL, with no plugin prefix', () => {
    expect(schema.pluginOptions.graphql).toEqual({
      typeName: { singular: 'EndUserProfile', plural: 'EndUserProfiles' },
    });
  });

  it('has the one stock attribute, `user`: required, locked, and a one-way relation to the end user', () => {
    expect(Object.keys(schema.attributes)).toEqual(['user']);
    expect(schema.attributes.user).toEqual({
      type: 'relation',
      relation: 'oneToOne',
      target: USER_UID,
      required: true,
      configurable: false,
    });
  });

  it('adds nothing to the user: no inversedBy and no mappedBy, which the boot check would refuse', () => {
    expect(schema.attributes.user).not.toHaveProperty('inversedBy');
    expect(schema.attributes.user).not.toHaveProperty('mappedBy');
    expect(() =>
      assertOneWayRelations({ 'plugin::end-users.profile': schema } as never)
    ).not.toThrow();
  });

  it('stays visible to the Content-Type Builder and the Content Manager, where a project adds fields', () => {
    expect(schema.pluginOptions).not.toHaveProperty('content-type-builder');
    expect(schema.pluginOptions).not.toHaveProperty('content-manager');
  });
});
