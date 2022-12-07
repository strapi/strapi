'use strict';

module.exports = ({ builder }) => {
  return builder.objectType('UsersPermissionsPasswordPayload', {
    fields(t) {
      return { ok: t.boolean({ nullable: false }) };
    },
  });
};
