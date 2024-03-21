import * as yup from 'yup';
import { validateYupSchemaSync } from '@strapi/utils';

const hasPermissionsSchema = yup.object({
  actions: yup.array().of(yup.string()),
  hasAtLeastOne: yup.boolean(),
});

export const validateHasPermissionsInput = validateYupSchemaSync(hasPermissionsSchema);
