'use strict';

module.exports = ({ builder }) => {
  return builder.inputType('UsersPermissionsLoginInput', {
    fields(t) {
      return {
        identifier: t.string({ required: true }),
        password: t.string({ required: true }),
        provider: t.string({ required: true, default: 'local' }),
      };
    },
  });
};
