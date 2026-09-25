import type { Core, Struct } from '@strapi/types';
import type { OpenAPIV3 } from 'openapi-types';
import type { Services } from '../services';

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

/** Default contracts loaded with the Documentation server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::documentation.documentation': Services['documentation'];
        'plugin::documentation.override': Services['override'];
      }
    }
  }
}
