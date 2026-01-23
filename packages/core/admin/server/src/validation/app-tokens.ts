import { yup, validateYupSchema, errors } from '@strapi/utils';
import { difference } from 'lodash/fp';
import constants from '../services/constants';
import { getService } from '../utils';
import type { AdminUser, Permission } from '../../../shared/contracts/shared';

const { ValidationError } = errors;

/**
 * Validate that app token permissions don't exceed user's own permissions
 * This prevents privilege escalation via app tokens
 */
export const validateAppTokenPermissions = async (
  permissions:
    | Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[]
    | undefined,
  user: AdminUser
) => {
  if (permissions === undefined || permissions.length === 0) {
    // No permissions = inherit mode, always valid
    return;
  }

  // Extract actions from permission objects
  const requestedActions = permissions.map((p) => p.action);

  // Get user's effective permissions
  const permissionService = getService('permission');
  const userPermissions = await permissionService.findUserPermissions(user);
  const userActions = userPermissions.map((p: Permission) => p.action);

  // Check if any requested permission exceeds user's permissions
  const invalidPermissions = difference(requestedActions, userActions);

  if (invalidPermissions.length > 0) {
    throw new ValidationError(
      `App token cannot have permissions that exceed your own: ${invalidPermissions.join(', ')}`
    );
  }

  // Validate all permissions are valid registered actions
  const validPermissions = permissionService.actionProvider.keys();
  const unknownPermissions = difference(requestedActions, validPermissions);

  if (unknownPermissions.length > 0) {
    throw new ValidationError(`Unknown permissions: ${unknownPermissions.join(', ')}`);
  }
};

const permissionSchema = yup.object().shape({
  action: yup.string().required(),
  subject: yup.string().nullable().optional(),
  properties: yup.object().optional(),
  conditions: yup.array().of(yup.string()).optional(),
});

const appTokenCreationSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).required(),
    description: yup.string().optional(),
    permissions: yup.array().of(permissionSchema).nullable(),
    lifespan: yup
      .number()
      .integer()
      .min(1)
      .oneOf(Object.values(constants.API_TOKEN_LIFESPANS).filter((v) => v !== null))
      .nullable(),
  })
  .noUnknown()
  .strict();

const appTokenUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).notNull(),
    description: yup.string().nullable(),
    permissions: yup.array().of(permissionSchema).nullable(),
    lifespan: yup
      .number()
      .integer()
      .min(1)
      .oneOf(Object.values(constants.API_TOKEN_LIFESPANS).filter((v) => v !== null))
      .nullable(),
  })
  .noUnknown()
  .strict();

const validateAppTokenCreationInputYup = validateYupSchema(appTokenCreationSchema);
const validateAppTokenUpdateInputYup = validateYupSchema(appTokenUpdateSchema);

export const validateAppTokenCreationInput = async (data: any, user: AdminUser) => {
  // Validate basic fields
  await validateAppTokenCreationInputYup(data);

  // CRITICAL: Validate permissions don't overflow
  await validateAppTokenPermissions(data.permissions, user);
};

export const validateAppTokenUpdateInput = async (data: any, user: AdminUser) => {
  // Validate basic fields
  await validateAppTokenUpdateInputYup(data);

  // CRITICAL: Validate permissions don't overflow
  await validateAppTokenPermissions(data.permissions, user);
};

export default {
  validateAppTokenCreationInput,
  validateAppTokenUpdateInput,
  validateAppTokenPermissions,
};
