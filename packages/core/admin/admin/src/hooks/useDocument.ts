import { getYupInnerErrors } from '@strapi/helper-plugin';
import { Schema, Entity as StrapiEntity, Attribute } from '@strapi/types';
import { ValidationError } from 'yup';

import { createYupSchema } from '../content-manager/utils/validation';

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
    const schema = createYupSchema(
      // @ts-expect-error - @TODO: createYupSchema types need to be revisited
      contentType,
      { components },
      { isCreatingEntry, isDraft: false, isJSONTestDisabled: true }
    );

    try {
      schema.validateSync(entry, { abortEarly: false });

      return {
        errors: {},
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          errors: getYupInnerErrors(error),
        };
      }

      throw error;
    }
  };

  return { validate };
}
