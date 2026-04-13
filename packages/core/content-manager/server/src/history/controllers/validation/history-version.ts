import { z, validateZod } from '@strapi/utils';

const historyRestoreVersionSchema = z.object({
  contentType: z.string().trim(),
});

export const validateRestoreVersion = validateZod(historyRestoreVersionSchema);
