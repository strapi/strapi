import type { UID, Attribute, Schema } from '@strapi/types';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
};

export type SchemaType = 'contentType' | 'component' | 'components';

export interface Component {
  uid: UID.Component;
  category: string;
  schema: Schema.Schema;
  isTemporary?: boolean;
  attributes?: Partial<Attribute.Any>[] | any[];
}

export interface ContentType {
  uid: string;
  isTemporary?: boolean;
  schema: Schema.ContentType;
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
    contentTypes?: Record<string, ContentType>;
    contentType?: ContentType;
  };
  reservedNames: Record<string, any>;
  isLoading: boolean;
  isLoadingForDataToBeSet: boolean;
  [key: string]: any;
}
