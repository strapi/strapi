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

export type { ModifiedLayoutData };
