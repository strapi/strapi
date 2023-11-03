import { yup, validateYupSchemaSync } from '@strapi/utils';

const hasPermissionsSchema = yup.object({
  actions: yup.array().of(yup.string()),
  hasAtLeastOne: yup.boolean(),
});

export default {
  validateHasPermissionsInput: validateYupSchemaSync(hasPermissionsSchema),
};
