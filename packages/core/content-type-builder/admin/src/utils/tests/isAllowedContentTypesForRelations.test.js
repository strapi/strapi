import isAllowedContentTypesForRelations from '../isAllowedContentTypesForRelations';

describe('CTB | utils | isAllowedContentTypesForRelations', () => {
  it('should be falsy if the model is a single type', () => {
    const contentType = {
      visible: true,
      name: 'plugin::users-permissions.user',
      title: 'User',
      plugin: 'users-permissions',
      uid: 'plugin::users-permissions.user',
      to: '/plugins/content-type-builder/content-types/plugin::users-permissions.user',
      kind: 'singleType',
      restrictRelationsTo: null,
    };

    expect(isAllowedContentTypesForRelations(contentType)).toBeFalsy();
  });

  it('should be falsy if the restricted relations is an empty array', () => {
    const contentType = {
      visible: true,
      name: 'plugin::users-permissions.user',
      title: 'User',
      plugin: 'users-permissions',
      uid: 'plugin::users-permissions.user',
      to: '/plugins/content-type-builder/content-types/plugin::users-permissions.user',
      kind: 'collectionType',
      restrictRelationsTo: [],
    };

    expect(isAllowedContentTypesForRelations(contentType)).toBeFalsy();
  });

  it('should be truthy if the model is a collection type and the restricted relations is null', () => {
    const contentType = {
      visible: true,
      name: 'plugin::users-permissions.user',
      title: 'User',
      plugin: 'users-permissions',
      uid: 'plugin::users-permissions.user',
      to: '/plugins/content-type-builder/content-types/plugin::users-permissions.user',
      kind: 'collectionType',
      restrictRelationsTo: null,
    };

    expect(isAllowedContentTypesForRelations(contentType)).toBeTruthy();
  });

  it('should be truthy if the model is a collection type and the restricted relations is not empty array', () => {
    const contentType = {
      visible: true,
      name: 'plugin::users-permissions.user',
      title: 'User',
      plugin: 'users-permissions',
      uid: 'plugin::users-permissions.user',
      to: '/plugins/content-type-builder/content-types/plugin::users-permissions.user',
      kind: 'collectionType',
      restrictRelationsTo: ['oneWay', 'manyWay'],
    };

    expect(isAllowedContentTypesForRelations(contentType)).toBeTruthy();
  });

  it('should be falsy if restrictRelationsTo is undefined', () => {
    const contentType = {
      visible: true,
      name: 'plugin::users-permissions.user',
      title: 'User',
      plugin: 'users-permissions',
      uid: 'plugin::users-permissions.user',
      to: '/plugins/content-type-builder/content-types/plugin::users-permissions.user',
      kind: 'collectionType',
    };

    expect(isAllowedContentTypesForRelations(contentType)).toBeFalsy();
  });

  it('should be falsy if kind is undefined', () => {
    const contentType = {
      visible: true,
      name: 'plugin::users-permissions.user',
      title: 'User',
      plugin: 'users-permissions',
      uid: 'plugin::users-permissions.user',
      to: '/plugins/content-type-builder/content-types/plugin::users-permissions.user',
      restrictRelationsTo: ['oneWay', 'manyWay'],
    };

    expect(isAllowedContentTypesForRelations(contentType)).toBeFalsy();
  });
});
