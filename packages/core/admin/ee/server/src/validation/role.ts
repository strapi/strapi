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
      .test(
        'roles-deletion-checks',
        'Roles deletion checks have failed',
        async function rolesDeletionChecks(ids) {
          try {
            await strapi.service('admin::role').checkRolesIdForDeletion(ids);

            if (strapi.ee.features.isEnabled('sso')) {
              await strapi.service('admin::role').ssoCheckRolesIdForDeletion(ids);
            }
          } catch (e: any) {
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
    async function noAdminSingleDelete(id) {
      try {
        await strapi.service('admin::role').checkRolesIdForDeletion([id]);

        if (strapi.ee.features.isEnabled('sso')) {
          await strapi.service('admin::role').ssoCheckRolesIdForDeletion([id]);
        }
      } catch (e: any) {
        return this.createError({ path: 'id', message: e.message });
      }

      return true;
    }
  );

export const validateRoleCreateInput = validateYupSchema(roleCreateSchema);
export const validateRolesDeleteInput = validateYupSchema(rolesDeleteSchema);
export const validateRoleDeleteInput = validateYupSchema(roleDeleteSchema);

export default {
  validateRoleCreateInput,
  validateRolesDeleteInput,
  validateRoleDeleteInput,
};
