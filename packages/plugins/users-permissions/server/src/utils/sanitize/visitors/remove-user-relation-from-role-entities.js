'use strict';

module.exports = ({ schema, key, attribute }, { remove }) => {
  if (
    attribute?.type === 'relation' &&
    attribute?.target === 'plugin::users-permissions.user' &&
    schema.uid === 'plugin::users-permissions.role'
  ) {
    remove(key);
  }
};
