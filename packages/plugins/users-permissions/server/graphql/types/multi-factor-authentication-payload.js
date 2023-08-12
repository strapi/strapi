'use strict';

module.exports = ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsMultiFactorAuthenticationPayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
