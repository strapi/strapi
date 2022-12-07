'use strict';

module.exports = ({ builder }) => {
  return builder.inputType('UsersPermissionsRegisterInput', {
    fields(t) {
      return {
        username: t.string(),
        email: t.string(),
        password: t.string(),
      };
    },
  });
};
