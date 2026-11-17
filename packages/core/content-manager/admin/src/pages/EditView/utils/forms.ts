import { getYupValidationErrors, type FormErrors } from '@strapi/admin/strapi-admin';
import { ValidationError } from 'yup';

import { createYupSchema } from '../../../utils/validation';

import { handleInvisibleAttributes } from './data';

import type {
  ComponentsDictionary,
  Document,
  Schema as ContentTypeSchema,
} from '../../../hooks/useDocument';
import type { Schema } from '@strapi/types';

type AnyData = Omit<Document, 'id'>;

/* -------------------------------------------------------------------------------------------------
 * createDefaultForm
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal Using the content-type schema & the components dictionary of the content-type,
 * creates a form with pre-filled default values. This is used when creating a new entry.
 */
const createDefaultForm = (
  contentType: Schema.Schema,
  components: ComponentsDictionary = {}
): AnyData => {
  const traverseSchema = (attributes: Schema.Schema['attributes']): AnyData => {
    return Object.entries(attributes).reduce<AnyData>((acc, [key, attribute]) => {
      if ('default' in attribute) {
        acc[key] = attribute.default;
      } else if (attribute.type === 'component' && attribute.required) {
        const defaultComponentForm = traverseSchema(components[attribute.component].attributes);

        if (attribute.repeatable) {
          acc[key] = attribute.min ? [...Array(attribute.min).fill(defaultComponentForm)] : [];
        } else {
          acc[key] = defaultComponentForm;
        }
      } else if (attribute.type === 'dynamiczone' && attribute.required) {
        acc[key] = [];
      }

      return acc;
    }, {});
  };

  return traverseSchema(contentType.attributes);
};

/* -------------------------------------------------------------------------------------------------
 * getPublishValidationErrors
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal Validates the values the same way the Publish action does (required fields are
 * enforced, fields hidden by visibility conditions are skipped) and returns the errors in the
 * shape the form expects, or `{}` when the values are valid. Used to show the errors up front
 * when the edit view is opened with `location.state.forceValidation` (e.g. from a release).
 */
const getPublishValidationErrors = (
  values: AnyData,
  { schema, components }: { schema?: ContentTypeSchema; components?: ComponentsDictionary }
): FormErrors => {
  const { data, removedAttributes } = handleInvisibleAttributes(values, {
    schema,
    initialValues: values,
    components,
  });

  try {
    createYupSchema(schema?.attributes, components, {
      status: 'published',
      removedAttributes,
    }).validateSync(data, { abortEarly: false });

    return {};
  } catch (error) {
    if (error instanceof ValidationError) {
      return getYupValidationErrors(error);
    }

    throw error;
  }
};

export { createDefaultForm, getPublishValidationErrors };
