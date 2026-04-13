import { z, contentTypes } from '@strapi/utils';
import type { UID } from '@strapi/types';
import { validateZodAsync } from '../../validation/zod';

interface Options {
  allowMultipleLocales?: boolean;
}

const singleLocaleSchema = z.string().nullable().optional();

const multipleLocaleSchema = z.union([z.array(z.string()), z.string().nullable()]).optional();

const statusSchema = z.enum(['draft', 'published'], { error: 'Invalid status' }).optional();

/**
 * From a request or query object, validates and returns the locale and status of the document.
 * If the status is not provided and Draft & Publish is disabled, it defaults to 'published'.
 */
export const getDocumentLocaleAndStatus = async (
  request: any,
  model: UID.Schema,
  opts: Options = { allowMultipleLocales: false }
) => {
  const { allowMultipleLocales } = opts;
  const { locale, status: providedStatus, ...rest } = request || {};

  const defaultStatus = contentTypes.hasDraftAndPublish(strapi.getModel(model))
    ? undefined
    : 'published';
  const status = providedStatus !== undefined ? providedStatus : defaultStatus;

  const schema = z.object({
    locale: allowMultipleLocales ? multipleLocaleSchema : singleLocaleSchema,
    status: statusSchema,
  });

  await validateZodAsync(schema)(request);

  return { locale, status, ...rest };
};
