'use strict';

module.exports = ({ nexus }) => {
  return nexus.inputObjectType({
    name: 'UsersPermissionsLoginInput',

    definition(t) {
      t.nonNull.string('identifier');
      t.nonNull.string('password');
      t.nonNull.string('provider', { default: 'local' });
    },
  });
};
