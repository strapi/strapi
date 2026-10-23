import type { ContentTypeBuilderConfig } from '../config';
import type { Controllers } from './controllers';
import type {
  ApiHandlerService,
  BuilderService,
  ComponentCategoriesService,
  ComponentHandler,
  ComponentsService,
  ContentStructureService,
  ContentTypeHandler,
  ContentTypesService,
  SchemaService,
} from './services';

export type * from './controllers';
export type * from './services';

/** Content-Type Builder services by name, as registered by the plugin. */
export type Services = {
  'api-handler': ApiHandlerService;
  builder: BuilderService;
  'component-categories': ComponentCategoriesService;
  components: ComponentsService;
  'content-structure': ContentStructureService;
  'content-types': ContentTypesService;
  schema: SchemaService;
};

/** Default contracts loaded with the Content-Type Builder server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * Schema changes the Content-Type Builder emits on the event hub, once the files are written.
       * The payload holds the content type or component as the builder wrote, created or deleted it
       * (its `uid`, `schema` as in its JSON file, …), not a loaded schema.
       */
      interface Events {
        'content-type.create': [{ contentType: ContentTypeHandler }];
        'content-type.update': [{ contentType: ContentTypeHandler }];
        'content-type.delete': [{ contentType: ContentTypeHandler }];
        'component.create': [{ component: ComponentHandler }];
        'component.update': [{ component: ComponentHandler }];
        'component.delete': [{ component: ComponentHandler }];
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

      interface PackageControllers {
        'plugin::content-type-builder.builder': Controllers['builder'];
        'plugin::content-type-builder.component-categories': Controllers['component-categories'];
        'plugin::content-type-builder.components': Controllers['components'];
        'plugin::content-type-builder.content-types': Controllers['content-types'];
        'plugin::content-type-builder.schema': Controllers['schema'];
      }

      interface PackageMiddlewares {
        'plugin::content-type-builder.isDevelopmentMode': undefined;
      }
    }
  }
}
