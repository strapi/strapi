import type { UID, Attribute, Schema } from '@strapi/types';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
};

export type SchemaType = 'contentType' | 'component' | 'components';

export type AttributeType = Attribute.Any & {
  name?: string;
};

export interface Component {
  uid: UID.Component;
  category: string;
  schema: Schema.Schema;
  isTemporary?: boolean;
  attributes?: AttributeType[];
  [key: string]: any;
}

export interface ContentType {
  uid: string;
  isTemporary?: boolean;
  schema: Schema.ContentType & {
    attributes?: AttributeType[];
  };
  [key: string]: any;
}

export type Components = Record<string, Component>;

export type ContentTypes = Record<string, ContentType>;
export interface DataManagerStateType {
  components?: Record<string, any>;
  contentTypes?: Record<string, ContentType>;
  initialComponents: Record<string, any>;
  initialContentTypes: Record<string, any>;
  initialData: Record<string, any>;
  modifiedData: {
    components?: Components;
    contentTypes?: ContentTypes;
    contentType?: ContentType;
    component?: Component;
  };
  reservedNames: Record<string, any>;
  isLoading: boolean;
  isLoadingForDataToBeSet: boolean;
  [key: string]: any;
}
