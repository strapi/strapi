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
 * If Draft & Publish is disabled, the returned status is always 'published' and a `status` in the
 * request is not validated against draft|published, as it may be a regular attribute of the model.
 */
export const getDocumentLocaleAndStatus = async (
  request: any,
  model: UID.Schema,
  opts: Options = { allowMultipleLocales: false }
) => {
  const { allowMultipleLocales } = opts;
  const { locale, ...rest } = request || {};

  const localeSchema = allowMultipleLocales ? multipleLocaleSchema : singleLocaleSchema;

  if (!contentTypes.hasDraftAndPublish(strapi.getModel(model))) {
    await validateZodAsync(z.object({ locale: localeSchema }))(request);

    return { ...rest, locale, status: 'published' as const };
  }

  await validateZodAsync(z.object({ locale: localeSchema, status: statusSchema }))(request);

  return { locale, ...rest };
};
