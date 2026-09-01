import { z, validateZodSchema } from '@strapi/utils';

const hasPermissionsSchema = z.object({
  actions: z.array(z.string()).optional(),
  hasAtLeastOne: z.boolean().optional(),
});

export const validateHasPermissionsInput = validateZodSchema(hasPermissionsSchema);
