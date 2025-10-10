import { yup, validateYupSchema } from '@strapi/utils';

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
          await strapi.service('admin::role').checkRolesIdForDeletion(ids);
        } catch (e) {
          // @ts-expect-error yup types
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
      await strapi.service('admin::role').checkRolesIdForDeletion([id]);
    } catch (e) {
      // @ts-expect-error yup types
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

export const validateRoleCreateInput = validateYupSchema(roleCreateSchema);
export const validateRoleUpdateInput = validateYupSchema(roleUpdateSchema);
export const validateRolesDeleteInput = validateYupSchema(rolesDeleteSchema);
export const validateRoleDeleteInput = validateYupSchema(roleDeleteSchema);

export default {
  validateRoleUpdateInput,
  validateRoleCreateInput,
  validateRolesDeleteInput,
  validateRoleDeleteInput,
};
