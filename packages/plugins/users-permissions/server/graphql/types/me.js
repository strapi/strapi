'use strict';

module.exports = ({ builder }) => {
  return builder.objectType('UsersPermissionsMe', {
    fields(t) {
      return {
        id: t.id({ nullable: false }),
        username: t.string({ nullable: false }),
        email: t.string(),
        confirmed: t.boolean(),
        blocked: t.boolean(),
        role: t.field({ type: 'UsersPermissionsMeRole' }),
      };
    },
  });
};
