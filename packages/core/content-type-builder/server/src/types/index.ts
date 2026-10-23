import type * as ComponentsService from '../services/components';
import type * as ContentTypesService from '../services/content-types';
import type * as SchemaService from '../services/schema';
import type { ContentTypeBuilderConfig } from '../config';
import type { SchemaHandler } from '../services/schema-builder/schema-handler';
import type {
  ApiHandlerService,
  BuilderService,
  ComponentCategoriesService,
  ContentStructureService,
} from './services';

export type * from './services';

/** Content-Type Builder services by name, as registered by the plugin. */
export type Services = {
  'api-handler': ApiHandlerService;
  builder: BuilderService;
  'component-categories': ComponentCategoriesService;
  components: typeof ComponentsService;
  'content-structure': ContentStructureService;
  'content-types': typeof ContentTypesService;
  schema: typeof SchemaService;
};

/** Default contracts loaded with the Content-Type Builder server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * Schema changes the Content-Type Builder emits on the event hub, once the files are written.
       * The payload holds the builder's schema handler of the content type or component (its `uid`,
       * `schema`, …), not a plain schema.
       */
      interface Events {
        'content-type.create': [{ contentType: SchemaHandler }];
        'content-type.update': [{ contentType: SchemaHandler }];
        'content-type.delete': [{ contentType: SchemaHandler }];
        'component.create': [{ component: SchemaHandler }];
        'component.update': [{ component: SchemaHandler }];
        'component.delete': [{ component: SchemaHandler }];
      }

      /** The plugin config merged with its defaults. */
      interface PackageConfigs {
        'plugin::content-type-builder': ContentTypeBuilderConfig;
      }

      interface PackageServices {
        'plugin::content-type-builder.api-handler': Services['api-handler'];
        'plugin::content-type-builder.builder': Services['builder'];
        'plugin::content-type-builder.component-categories': Services['component-categories'];
        'plugin::content-type-builder.components': Services['components'];
        'plugin::content-type-builder.content-structure': Services['content-structure'];
        'plugin::content-type-builder.content-types': Services['content-types'];
        'plugin::content-type-builder.schema': Services['schema'];
      }

      interface PackageMiddlewares {
        'plugin::content-type-builder.isDevelopmentMode': undefined;
      }
    }
  }
}
