'use strict';

module.exports = ({ nexus }) => {
  return nexus.inputObjectType({
    name: 'UsersPermissionsMultiFactorAuthenticationInput',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
