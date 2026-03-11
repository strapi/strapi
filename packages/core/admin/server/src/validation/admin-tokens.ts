import { yup, validateYupSchema } from '@strapi/utils';
import constants from '../services/constants';
import { permission } from './common-validators';

const adminTokenCreationSchema = yup
  .object()
  .shape({
    kind: yup.string().oneOf(['admin']).optional(),
    name: yup.string().min(1).required(),
    description: yup.string().optional(),
    lifespan: yup.number().min(1).oneOf(Object.values(constants.API_TOKEN_LIFESPANS)).nullable(),
    adminPermissions: yup.array().of(permission),
    // adminUserOwner is set by the controller from ctx.state.user (full user object) or a strapiID from body
    adminUserOwner: yup.mixed().nullable(),
  })
  .noUnknown()
  .strict();

const adminTokenUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).notNull(),
    description: yup.string().nullable(),
    adminPermissions: yup.array().of(permission).nullable(),
  })
  .noUnknown()
  .strict();

export const validateAdminTokenCreationInput = validateYupSchema(adminTokenCreationSchema);
export const validateAdminTokenUpdateInput = validateYupSchema(adminTokenUpdateSchema);
