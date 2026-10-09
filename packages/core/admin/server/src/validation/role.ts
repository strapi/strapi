import { yup, validateYupSchema } from '@strapi/utils';
import constants from '../services/constants';

const { ROLE_TEXT_MAX_LENGTH } = constants;

const roleCreateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).max(ROLE_TEXT_MAX_LENGTH).required(),
    description: yup.string().max(ROLE_TEXT_MAX_LENGTH).nullable(),
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
      .test(
        'roles-deletion-checks',
        'Roles deletion checks have failed',
        async function checkRolesDeletion(ids) {
          try {
            await strapi.service('admin::role').checkRolesIdForDeletion(ids);
          } catch (e) {
            // @ts-expect-error yup types
            return this.createError({ path: 'ids', message: e.message });
          }

          return true;
        }
      ),
  })
  .noUnknown();

const roleDeleteSchema = yup
  .strapiID()
  .required()
  .test(
    'no-admin-single-delete',
    'Role deletion checks have failed',
    async function checkRoleDeletion(id) {
      try {
        await strapi.service('admin::role').checkRolesIdForDeletion([id]);
      } catch (e) {
        // @ts-expect-error yup types
        return this.createError({ path: 'id', message: e.message });
      }

      return true;
    }
  );

const roleUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).max(ROLE_TEXT_MAX_LENGTH),
    description: yup.string().max(ROLE_TEXT_MAX_LENGTH).nullable(),
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
