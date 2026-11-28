import { validateYupSchemaSync, yup } from '@strapi/utils';

const hasAnyAdminPermissionSchema = yup
  .object({
    actions: yup.array().of(yup.string().min(1).required()).min(1).required(),
  })
  .required();

/** The policy's config. `createPolicy` turns whatever this throws into its own boot error. */
export const validateHasAnyAdminPermissionConfig = validateYupSchemaSync(
  hasAnyAdminPermissionSchema,
  { abortEarly: true }
);

const hasRoleSchema = yup
  .object({
    roles: yup.array().of(yup.string().trim().min(1).required()).min(1).required(),
    mode: yup.string().oneOf(['any', 'all']),
  })
  .noUnknown()
  .required();

/**
 * `plugin::end-users.has-role`'s config: at least one role, by name or `documentId`, and how many
 * of them the user must hold. With no role there is nothing to hold, and `all` of nothing would let
 * everyone through, so it is refused rather than read as a rule.
 */
export const validateHasRoleConfig = validateYupSchemaSync(hasRoleSchema, { abortEarly: true });
