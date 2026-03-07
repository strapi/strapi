import { yup, validateYupSchema } from '@strapi/utils';

/** Type for validators to avoid referencing yup internals in emitted .d.ts (pnpm portability) */
type ValidatorFn = (body: unknown, errorMessage?: string) => Promise<unknown>;

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

export const validateRoleCreateInput: ValidatorFn = validateYupSchema(roleCreateSchema);
export const validateRoleUpdateInput: ValidatorFn = validateYupSchema(roleUpdateSchema);
export const validateRolesDeleteInput: ValidatorFn = validateYupSchema(rolesDeleteSchema);
export const validateRoleDeleteInput: ValidatorFn = validateYupSchema(roleDeleteSchema);

export default {
  validateRoleUpdateInput,
  validateRoleCreateInput,
  validateRolesDeleteInput,
  validateRoleDeleteInput,
} as Record<string, ValidatorFn>;
