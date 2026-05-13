import { z } from '@strapi/utils';
import { validateZodAsync, strapiID } from '../../validation/zod';

const validateFindAvailableSchema = z.object({
  component: z.string().optional(),
  id: strapiID.optional(),
  _q: z.string().optional(),
  idsToOmit: z.array(strapiID).optional(),
  idsToInclude: z.array(strapiID).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  locale: z.string().nullable().optional(),
  status: z.enum(['published', 'draft']).nullable().optional(),
});

const validateFindExistingSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  locale: z.string().nullable().optional(),
  status: z.enum(['published', 'draft']).nullable().optional(),
});

const validateFindAvailable = validateZodAsync(validateFindAvailableSchema);
const validateFindExisting = validateZodAsync(validateFindExistingSchema);

export { validateFindAvailable, validateFindExisting };
