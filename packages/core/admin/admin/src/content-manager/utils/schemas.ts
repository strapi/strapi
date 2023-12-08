import merge from 'lodash/merge';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

type ContentTypeLayoutData = Contracts.ContentTypes.FindContentTypeConfiguration.Response['data'];
type ComponentLayoutData = Contracts.Components.FindComponentConfiguration.Response['data'];

type LayoutData<TKey> = TKey extends 'component'
  ? ComponentLayoutData
  : TKey extends 'contentType'
  ? ContentTypeLayoutData
  : never;

type Models = Array<Contracts.Components.Component | Contracts.ContentTypes.ContentType>;

type ModifiedLayoutData<TKey> = TKey extends 'component'
  ? Omit<ComponentsWithSchemas<ComponentLayoutData>, TKey> & {
      [K in TKey]: Contracts.Components.ComponentConfiguration & Contracts.Components.Component;
    }
  : TKey extends 'contentType'
  ? Omit<ComponentsWithSchemas<ContentTypeLayoutData>, TKey> & {
      [K in TKey]: Contracts.ContentTypes.Configuration & Contracts.ContentTypes.ContentType;
    }
  : never;

type ComponentsWithSchemas<
  TData extends { components: Record<string, Contracts.Components.ComponentConfiguration> }
> = Omit<TData, 'components'> & {
  components: Record<
    string,
    Contracts.Components.ComponentConfiguration & Contracts.Components.Component
  >;
};

/**
 * TODO: this needs refactoring because typescript doesn't like the fact we just pass
 * a key that doesn't exist on both objects.
 */
const mergeMetasWithSchema = <TKey extends 'component' | 'contentType'>(
  data: LayoutData<TKey>,
  schemas: Models,
  mainSchemaKey: TKey
): ModifiedLayoutData<TKey> => {
  const findSchema = (uid: string) => schemas.find((obj) => obj.uid === uid);
  const merged = Object.assign({}, data);

  // @ts-expect-error – TODO: fix me
  const { uid } = data[mainSchemaKey];
  const schema = findSchema(uid);

  // TODO:
  // In order to merge all the layers of the schema objects, we used the Lodash function "merge".
  // If the destructuration is used, it will only merge the first layer of properties and overwrite the nested objects.

  // @ts-expect-error – TODO: fix me
  merged[mainSchemaKey] = merge({}, schema, data[mainSchemaKey]);

  Object.keys(data.components).forEach((compoUID) => {
    const compoSchema = findSchema(compoUID);

    merged.components[compoUID] = {
      ...data.components[compoUID],
      ...compoSchema,
    };
  });

  // @ts-expect-error – TODO: fix me
  return merged;
};

export { mergeMetasWithSchema };
export type { ModifiedLayoutData };
