import { Schema, Entity as StrapiEntity, Attribute } from '@strapi/types';

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
}

/**
 * @alpha - This hook is not recommended to use it because is likely to be completely change, use it at your own risk
 */
export function useDocument() {
  /**
   * @TODO: Ideally, we should get the contentType and components schemas from the redux store
   * But at the moment the store is populated only inside the content-manager by useContentManagerInitData
   * So, we need to receive the content type schema and the components to use the function
   */
  const validate = (
    entry: Entity & { [key: string]: Attribute.Any },
    { contentType, components }: ValidateOptions
  ) => {
    // @ts-expect-error - @TODO: createYupSchema types need to be revisited
    const schema = createYupSchema(contentType, { components }, { isCreatingEntry: false });

    return schema.validateSync(entry, { abortEarly: false });
  };

  return { validate };
}
