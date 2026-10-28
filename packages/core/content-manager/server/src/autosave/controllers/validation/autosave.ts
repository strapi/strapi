import { z, validateZodSchema } from '@strapi/utils';

const saveAutosaveSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  baseVersion: z.string().trim().min(1).optional(),
});

export const validateSaveAutosave = validateZodSchema(saveAutosaveSchema);
