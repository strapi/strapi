'use strict';

module.exports = ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsLoginPayload',

    definition(t) {
      t.string('jwt');
      t.nonNull.field('user', { type: 'UsersPermissionsMe' });
    },
  });
};
