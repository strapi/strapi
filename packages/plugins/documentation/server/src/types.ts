import type { Core, Struct } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';

export interface Config {
  restrictedAccess: boolean;
  password?: string;
}

export type PluginConfig = {
  openapi?: string;
  info?: Partial<OpenAPIV3_1.InfoObject> & {
    'x-generation-date'?: string;
  };
  servers?: OpenAPIV3_1.ServerObject[];
  externalDocs?: OpenAPIV3_1.ExternalDocumentationObject;
  security?: OpenAPIV3_1.SecurityRequirementObject[];
  paths?: OpenAPIV3_1.PathsObject;
  components?: OpenAPIV3_1.ComponentsObject;
  tags?: OpenAPIV3_1.TagObject[];
  webhooks?: OpenAPIV3_1.Document['webhooks'];
  'x-strapi-config': {
    plugins: string[] | null;
    mutateDocumentation?: ((state: OpenAPIV3_1.Document) => OpenAPIV3_1.Document) | null;
  };
};

export interface ApiInfo {
  routeInfo: Core.Router;
  attributes: Struct.SchemaAttributes;
  uniqueName: string;
  contentTypeInfo: any;
  kind: string;
}

export interface Api {
  getter: string;
  name: string;
  ctNames: string[];
}
