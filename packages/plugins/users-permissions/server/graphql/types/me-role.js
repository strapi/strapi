'use strict';

module.exports = ({ builder }) => {
  return builder.objectType('UsersPermissionsMeRole', {
    fields(t) {
      return {
        id: t.id({ nullable: false }),
        name: t.string({ nullable: false }),
        description: t.string(),
        type: t.string(),
      };
    },
  });
};
