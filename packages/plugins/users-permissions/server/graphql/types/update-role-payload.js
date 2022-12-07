'use strict';

module.exports = ({ builder }) => {
  return builder.objectType('UsersPermissionsUpdateRolePayload', {
    fields(t) {
      return {
        ok: t.boolean({ nullable: false }),
      };
    },
  });
};
