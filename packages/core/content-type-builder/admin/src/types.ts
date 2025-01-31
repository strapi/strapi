import type { Internal, Schema } from '@strapi/types';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
};

export type SchemaType = 'contentType' | 'component';

export type DifferentAttributesKind = 'Populatable' | 'NonPopulatable' | 'Any';

export type Status = 'UNCHANGED' | 'CHANGED' | 'REMOVED' | 'NEW';

export type AttributeType = Schema.Attribute.AnyAttribute & {
  name?: string;
  target?: string;
  targetAttribute?: string | null;
  customField?: any;
  default?: any;
  repeatable?: boolean;
  status?: Status;
  [key: string]: any;
};

type Schema = {
  modelType: 'contentType' | 'component';
  attributes: any[];
  [key: string]: any;
};

export interface Component {
  uid: Internal.UID.Component;
  category?: string;
  schema: Schema;
  isTemporary?: boolean;
  attributes?: AttributeType[];
  status?: Status;
  [key: string]: any;
}

export interface ContentType {
  uid: Internal.UID.ContentType;
  isTemporary?: boolean;
  visible?: boolean;
  name?: string;
  title?: string;
  plugin?: string;
  to?: string;
  restrictRelationsTo?: unknown;
  schema: Schema;
  status?: Status;
  [key: string]: any;
}

export type Components = Record<string, Component>;

export type ContentTypes = Record<string, ContentType>;
export interface DataManagerStateType {
  components: Components;
  initialComponents: Components;
  contentTypes: ContentTypes;
  initialContentTypes: ContentTypes;
  reservedNames: {
    models: string[];
    attributes: string[];
  };
  isLoading: boolean;
  [key: string]: any;
}
