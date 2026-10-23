import type { Core, Struct, UID } from '@strapi/types';
import type { OpenAPIV3 } from 'openapi-types';

export interface Config {
  restrictedAccess: boolean;
  password?: string;
}

export type PluginConfig = OpenAPIV3.Document & {
  info: OpenAPIV3.InfoObject & {
    'x-generation-date'?: string;
  };
  'x-strapi-config': {
    plugins: string[] | null;
    mutateDocumentation?: ((state: OpenAPIV3.Document) => OpenAPIV3.Document) | null;
  };
};

export interface ApiInfo {
  uid: UID.ContentType;
  routeInfo: Core.Router;
  attributes: Struct.SchemaAttributes;
  uniqueName: string;
  contentTypeInfo: any;
  kind: string;
}

export interface Api {
  getter: 'plugin' | 'api';
  name: string;
  ctNames: string[];
}
