import { z, validateZod } from '@strapi/utils';

const hasPermissionsSchema = z.object({
  actions: z.array(z.string()).optional(),
  hasAtLeastOne: z.boolean().optional(),
});

export const validateHasPermissionsInput = validateZod(hasPermissionsSchema);
