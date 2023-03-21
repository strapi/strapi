'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const roleCreateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).required(),
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
      .test('roles-deletion-checks', 'Roles deletion checks have failed', async function (ids) {
        try {
          await strapi.admin.services.role.checkRolesIdForDeletion(ids);
        } catch (e) {
          return this.createError({ path: 'ids', message: e.message });
        }

        return true;
      }),
  })
  .noUnknown();

const roleDeleteSchema = yup
  .strapiID()
  .required()
  .test('no-admin-single-delete', 'Role deletion checks have failed', async function (id) {
    try {
      await strapi.admin.services.role.checkRolesIdForDeletion([id]);
    } catch (e) {
      return this.createError({ path: 'id', message: e.message });
    }

    return true;
  });

const roleUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1),
    description: yup.string().nullable(),
  })
  .noUnknown();

module.exports = {
  validateRoleUpdateInput: validateYupSchema(roleUpdateSchema),
  validateRoleCreateInput: validateYupSchema(roleCreateSchema),
  validateRolesDeleteInput: validateYupSchema(rolesDeleteSchema),
  validateRoleDeleteInput: validateYupSchema(roleDeleteSchema),
};
