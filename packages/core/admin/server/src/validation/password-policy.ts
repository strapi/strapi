import { z, validateZodSchema } from '@strapi/utils';

import {
  PASSWORD_MIN_LENGTH_CEILING,
  PASSWORD_MIN_LENGTH_FLOOR,
} from '../services/password-policy';

const passwordPolicySchema = z
  .object({
    minLength: z.number().int().min(PASSWORD_MIN_LENGTH_FLOOR).max(PASSWORD_MIN_LENGTH_CEILING),
    requireLowercase: z.boolean(),
    requireUppercase: z.boolean(),
    requireNumber: z.boolean(),
    requireSpecialCharacter: z.boolean(),
  })
  .strict();

export const validateUpdatePasswordPolicy = validateZodSchema(passwordPolicySchema);

export default {
  validateUpdatePasswordPolicy,
};
