import { z } from '@strapi/utils';

export const localeSchema = z
  .string()
  .optional()
  .describe('Locale code (e.g. "en", "fr"). Defaults to the default locale.');

export const statusSchema = z
  .enum(['draft', 'published'])
  .optional()
  .describe('Document status. Defaults to "draft" when draftAndPublish is enabled.');

export const documentIdSchema = z
  .string()
  .min(1)
  .describe(
    'Stable document ID (e.g. "z7v8zma53x01r6oceimv922b"). Use this as the canonical identifier across draft/published versions; numeric "id" can differ per version row.'
  );

export const pageSchema = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe('Page number (1-indexed, default: 1).');

export const pageSizeSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Items per page (default: 25, max: 100).');
