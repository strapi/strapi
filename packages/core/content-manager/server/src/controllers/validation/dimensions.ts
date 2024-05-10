import { errors, yup, validateYupSchema } from '@strapi/utils';

interface Options {
  allowMultipleLocales?: boolean;
}

const singleLocaleSchema = yup.string().nullable();

const multipleLocaleSchema = yup.lazy((value) =>
  Array.isArray(value) ? yup.array().of(singleLocaleSchema.required()) : singleLocaleSchema
);

const statusSchema = yup.mixed().oneOf(['draft', 'published'], 'Invalid status');

/**
 * From a request or query object, validates and returns the locale and status of the document
 */
export const getDocumentLocaleAndStatus = async (
  request: any,
  opts: Options = { allowMultipleLocales: false }
) => {
  const { allowMultipleLocales } = opts;
  const { locale, status, ...rest } = request || {};

  const schema = yup.object().shape({
    locale: allowMultipleLocales ? multipleLocaleSchema : singleLocaleSchema,
    status: statusSchema,
  });

  try {
    await validateYupSchema(schema, { strict: true, abortEarly: false })(request);

    return { locale, status, ...rest };
  } catch (error: any) {
    throw new errors.ValidationError(`Validation error: ${error.message}`);
  }
};
