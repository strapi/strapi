'use strict';

module.exports = ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsMe',

    definition(t) {
      t.nonNull.id('id');
      t.nonNull.string('username');
      t.string('email');
      t.boolean('confirmed');
      t.boolean('blocked');
      t.field('role', { type: 'UsersPermissionsMeRole' });
    },
  });
};
