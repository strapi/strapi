import { getYupInnerErrors } from '@strapi/helper-plugin';
import { Schema, Entity as StrapiEntity, Attribute } from '@strapi/types';

import { createYupSchema } from '../content-manager/utils/validation';

import type { ValidationError } from 'yup';

export interface Entity {
  id: StrapiEntity.ID;
  createdAt: string;
  updatedAt: string;
}

interface ValidateOptions {
  contentType: Schema.ContentType;
  components: {
    [key: Schema.Component['uid']]: Schema.Component;
  };
  isCreatingEntry?: boolean;
}

/**
 * @alpha - This hook is not stable and likely to change. Use at your own risk.
 */
export function useDocument() {
  /**
   * @TODO: Ideally, we should get the contentType and components schemas from the redux store
   * But at the moment the store is populated only inside the content-manager by useContentManagerInitData
   * So, we need to receive the content type schema and the components to use the function
   */
  const validate = (
    entry: Entity & { [key: string]: Attribute.Any },
    { contentType, components, isCreatingEntry = false }: ValidateOptions
  ) => {
    // @ts-expect-error - @TODO: createYupSchema types need to be revisited
    const schema = createYupSchema(contentType, { components }, { isCreatingEntry });

    try {
      schema.validateSync(entry, { abortEarly: false });

      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'error',
        errors: getYupInnerErrors(error as ValidationError),
      };
    }
  };

  return { validate };
}
