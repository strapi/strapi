import type { UID, Attribute, Schema } from '@strapi/types';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
};

export type SchemaType = 'contentType' | 'component' | 'components';

export type DifferentAttributesKind = 'Populatable' | 'NonPopulatable' | 'Any';

export type AttributeType = Attribute.Any & {
  name: string;
  target: string;
  targetAttribute: string;
  customField?: any;
};

export interface Component {
  uid: UID.Component;
  category: string;
  schema: Schema.Component & {
    name: string;
    description?: string;
    icon?: string;
    attributes?: AttributeType[];
    [key: string]: any;
  };
  isTemporary?: boolean;
  attributes?: AttributeType[];
  [key: string]: any;
}

export interface ContentType {
  uid: string;
  isTemporary?: boolean;
  schema: Schema.ContentType & {
    attributes?: AttributeType[];
    visible?: boolean;
    restrictRelationsTo?: any;
    displayName?: string;
  };
  [key: string]: any;
}

export type Components = Record<string, Component>;

export type ContentTypes = Record<string, ContentType>;
export interface DataManagerStateType {
  components?: Components;
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
