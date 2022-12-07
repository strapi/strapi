'use strict';

module.exports = ({ builder }) => {
  return builder.objectType('UsersPermissionsDeleteRolePayload', {
    fields(t) {
      return {
        ok: t.boolean({ nullable: false }),
      };
    },
  });
};
