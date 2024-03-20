import type { Internal, Schema } from '@strapi/types';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
};

export type SchemaType = 'contentType' | 'component' | 'components';

export type DifferentAttributesKind = 'Populatable' | 'NonPopulatable' | 'Any';

export type AttributeType = Schema.Attribute.AnyAttribute & {
  name?: string;
  target?: string;
  targetAttribute?: string | null;
  customField?: any;
  default?: any;
  repeatable?: boolean;
  [key: string]: any;
};

export interface Component {
  uid: Internal.UID.Component;
  category?: string;
  schema: any;
  isTemporary?: boolean;
  attributes?: AttributeType[];
  [key: string]: any;
}

export interface ContentType {
  uid?: Internal.UID.ContentType;
  isTemporary?: boolean;
  visible?: boolean;
  name?: string;
  title?: string;
  plugin?: string;
  to?: string;
  kind?: 'singleType' | 'collectionType';
  restrictRelationsTo?: unknown;
  schema?: any;
  [key: string]: any;
}

export type Components = Record<string, Component>;

export type ContentTypes = Record<string, ContentType>;
export interface DataManagerStateType {
  components: Components;
  contentTypes?: ContentTypes;
  initialComponents: Components;
  initialContentTypes: ContentTypes;
  initialData: Record<string, any>;
  modifiedData: {
    components: Components;
    contentTypes: ContentTypes;
    contentType?: ContentType;
    component?: Component;
  };
  reservedNames: Record<string, string>;
  isLoading: boolean;
  isLoadingForDataToBeSet: boolean;
  [key: string]: any;
}
