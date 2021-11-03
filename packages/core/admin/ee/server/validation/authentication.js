'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const providerOptionsUpdateSchema = yup.object().shape({
  autoRegister: yup.boolean().required(),
  defaultRole: yup
    .strapiID()
    .required()
    .test('is-valid-role', 'You must submit a valid default role', roleId => {
      return strapi.admin.services.role.exists({ id: roleId });
    }),
});

module.exports = {
  validateProviderOptionsUpdate: validateYupSchema(providerOptionsUpdateSchema),
};
