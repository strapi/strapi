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
