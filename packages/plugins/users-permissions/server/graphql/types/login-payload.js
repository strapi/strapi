'use strict';

module.exports = ({ builder }) => {
  return builder.objectType('UsersPermissionsLoginPayload', {
    fields(t) {
      return {
        jwt: t.string(),
        user: t.field({ type: 'UsersPermissionsMe', nullable: false }),
      };
    },
  });
};
