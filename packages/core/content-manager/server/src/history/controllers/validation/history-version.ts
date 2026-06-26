import { z, validateZodSchema } from '@strapi/utils';

const historyRestoreVersionSchema = z.object({
  contentType: z.string().trim(),
});

export const validateRestoreVersion = validateZodSchema(historyRestoreVersionSchema);
