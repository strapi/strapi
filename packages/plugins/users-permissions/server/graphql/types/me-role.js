'use strict';

module.exports = ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsMeRole',

    definition(t) {
      t.nonNull.id('id');
      t.nonNull.string('name');
      t.string('description');
      t.string('type');
    },
  });
};
