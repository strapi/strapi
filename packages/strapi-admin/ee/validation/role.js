'use strict';

const { yup, formatYupErrors, stringIncludes, stringEquals } = require('strapi-utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

const roleCreateSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .required(),
    description: yup.string().nullable(),
  })
  .noUnknown();

const roleUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1),
    description: yup.string().nullable(),
  })
  .noUnknown();

const rolesDeleteSchema = yup
  .object()
  .shape({
    ids: yup
      .array()
      .of(yup.strapiID())
      .min(1)
      .required()
      .test('no-admin-many-delete', 'You cannot delete the super admin role', async ids => {
        const superAdminRole = await strapi.admin.services.role.getSuperAdmin();
        return !superAdminRole || !stringIncludes(ids, superAdminRole.id);
      }),
  })
  .noUnknown();

const roleDeleteSchema = yup
  .strapiID()
  .required()
  .test('no-admin-single-delete', 'You cannot delete the super admin role', async function(id) {
    const superAdminRole = await strapi.admin.services.role.getSuperAdmin();
    return !superAdminRole || !stringEquals(id, superAdminRole.id)
      ? true
      : this.createError({ path: 'id', message: `You cannot delete the super admin role` });
  });

const validateRoleCreateInput = async data => {
  return roleCreateSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

const validateRoleUpdateInput = async data => {
  return roleUpdateSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

const validateRolesDeleteInput = async data => {
  return rolesDeleteSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

const validateRoleDeleteInput = async data => {
  return roleDeleteSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

module.exports = {
  validateRoleCreateInput,
  validateRoleUpdateInput,
  validateRolesDeleteInput,
  validateRoleDeleteInput,
};
