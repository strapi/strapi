import type { UID } from '@strapi/types';

export type IntlLabel = {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
};

export type SchemaType = 'contentType' | 'component' | 'components';

export type BasicAttribute = {
  name: string;
  relation: string;
  target: string;
  targetAttribute: string;
  type: string;
  private?: boolean;
  pluginOptions?: Record<string, any>;
};

export interface DataManagerStateType {
  components: Record<string, any>;
  contentTypes: Record<string, any>;
  initialComponents: Record<string, any>;
  initialContentTypes: Record<string, any>;
  initialData: Record<string, any>;
  modifiedData: {
    components?: Record<string, Component>;
    contentTypes?: Record<string, ContentType>;
  };
  reservedNames: Record<string, any>;
  isLoading: boolean;
  isLoadingForDataToBeSet: boolean;
  [key: string]: any;
}

export interface Attribute {
  name: string;
  type: string;
  relation?: string;
  targetAttribute?: string | null;
  target?: string;
  customField?: string;
  repeatable?: boolean;
  component?: UID.Component;
  components?: UID.Component[];
  private?: boolean;
  default?: string | null;
  pluginOptions?: Record<string, any>;
  targetField?: string;
}

export interface Schema {
  icon?: string;
  name: string;
  description: string;
  connection: string;
  collectionName: string;
  attributes: Attribute[];
}

export interface Component {
  uid: UID.Component;
  category: string;
  schema: Schema;
  isTemporary?: boolean;
  attributes: Attribute[];
}

export interface ContentTypeSchema {
  displayName: string;
  kind: string;
  visible: boolean;
  restrictRelationsTo: string[] | null;
  attributes: Attribute[];
}

export interface ContentType {
  uid: string;
  isTemporary?: boolean;
  schema: ContentTypeSchema;
}
