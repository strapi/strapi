'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

const providerOptionsUpdateSchema = yup.object().shape({
  autoRegister: yup.boolean().required(),
  defaultRole: yup
    .strapiID()
    .required()
    .test('is-valid-role', 'You must submit a valid default role', roleId => {
      return strapi.admin.services.role.exists({ id: roleId });
    }),
});

const validateProviderOptionsUpdate = async data => {
  return providerOptionsUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validateProviderOptionsUpdate,
};
