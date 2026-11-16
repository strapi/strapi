import type { traverseEntity } from '@strapi/utils';

const removeUserRelationFromRoleEntities: Parameters<typeof traverseEntity>[0] = (
  { schema, key, attribute },
  { remove }
) => {
  if (
    attribute?.type === 'relation' &&
    attribute?.target === 'plugin::users-permissions.user' &&
    schema.uid === 'plugin::users-permissions.role'
  ) {
    remove(key);
  }
};

export default removeUserRelationFromRoleEntities;
