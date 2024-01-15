import * as React from 'react';

import { TranslationMessage, getYupInnerErrors } from '@strapi/helper-plugin';
import { Schema, Entity as StrapiEntity, Attribute } from '@strapi/types';
import { ValidationError } from 'yup';

import { createYupSchema } from '../content-manager/utils/validation';

export interface Entity {
  id: StrapiEntity.ID;
  createdAt: string;
  updatedAt: string;
}

interface UseDocumentOptions {
  components?: {
    [key: Schema.Component['uid']]: Schema.Component;
  };
}

/**
 * @alpha - This hook is not recommended to use it because is likely to be completely change, use it at your own risk
 * @TODO: Ideally, we should get the contentType schema from the redux store
 * But at the moment the store is populated only inside the content-manager by useContentManagerInitData
 * So, we need to receive the content type schema and the components to use this hook
 */
export function useDocument(
  contentTypeSchema: Schema.Schema,
  entry: Entity & { [key: string]: Attribute.Any },
  { components = {} }: UseDocumentOptions
) {
  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, TranslationMessage>
  >({});
  const yupSchema = contentTypeSchema
    ? // @ts-expect-error - @TODO: createYupSchema types need to be revisited
      createYupSchema(contentTypeSchema, { components }, { isCreatingEntry: false })
    : null;

  React.useEffect(() => {
    if (yupSchema) {
      try {
        yupSchema.validateSync(entry, { abortEarly: false });

        setValidationErrors({});
      } catch (err) {
        if (err instanceof ValidationError) {
          setValidationErrors(getYupInnerErrors(err));
        }
      }
    }
  }, [entry, yupSchema]);

  return { validationErrors };
}
