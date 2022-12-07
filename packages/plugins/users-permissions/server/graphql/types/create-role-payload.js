'use strict';

module.exports = ({ builder }) => {
  return builder.objectType('UsersPermissionsCreateRolePayload', {
    fields(t) {
      return {
        ok: t.boolean({ nullable: false }),
      };
    },
  });
};
