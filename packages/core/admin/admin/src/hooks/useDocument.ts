import * as React from 'react';

import { getYupInnerErrors } from '@strapi/helper-plugin';
import { Schema } from '@strapi/types';
import { ValidationError } from 'yup';

import { createYupSchema } from '../content-manager/utils/validation';

interface UseDocumentOptions {
  components: Schema.Component[];
}

/**
 * @alpha - This hook is not recommended to use it because is likely to be 100% refactor for v5
 * @TODO: Ideally, we should get the contentType schema from the redux store
 * But at the moment the store is populated only inside the content-manager by useContentManagerInitData
 * So, we need to receive the content type schema and the components to use this hook
 */
export function useDocument(
  contentTypeSchema: Schema.Schema,
  entry: any,
  { components }: UseDocumentOptions
) {
  console.log('test');
  const [validationErrors, setValidationErrors] = React.useState({});
  // @ts-expect-error - ignore
  const yupSchema = createYupSchema(contentTypeSchema, { components }, { isCreatingEntry: false });

  const getValidationErrors = () => {
    try {
      yupSchema.validateSync(entry, { abortEarly: false });

      setValidationErrors({});
    } catch (err) {
      if (err instanceof ValidationError) {
        setValidationErrors(getYupInnerErrors(err));
      }

      setValidationErrors({});
    }
  };

  React.useEffect(() => {
    getValidationErrors();
  }, [entry]);

  return { validationErrors };
}
