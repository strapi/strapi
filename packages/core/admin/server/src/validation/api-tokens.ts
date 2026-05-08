import { yup, validateYupSchema } from '@strapi/utils';
import constants from '../services/constants';

const apiTokenCreationSchema = yup
  .object()
  .shape({
    kind: yup.string().oneOf(['content-api']).optional(),
    name: yup.string().min(1).required(),
    description: yup.string().optional(),
    type: yup.string().oneOf(Object.values(constants.API_TOKEN_TYPE)).optional(),
    permissions: yup.array().of(yup.string()).nullable(),
    lifespan: yup.number().min(1).oneOf(Object.values(constants.API_TOKEN_LIFESPANS)).nullable(),
  })
  .noUnknown()
  .strict();

const apiTokenUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).notNull(),
    description: yup.string().nullable(),
    type: yup.string().oneOf(Object.values(constants.API_TOKEN_TYPE)).optional(),
    permissions: yup.array().of(yup.string()).nullable(),
  })
  .noUnknown()
  .strict();

export const validateApiTokenCreationInput = validateYupSchema(apiTokenCreationSchema);
export const validateApiTokenUpdateInput = validateYupSchema(apiTokenUpdateSchema);

export default {
  validateApiTokenCreationInput,
  validateApiTokenUpdateInput,
};
