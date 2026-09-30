import type * as ApiHandlerService from '../services/api-handler';
import type * as BuilderService from '../services/builder';
import type * as ComponentCategoriesService from '../services/component-categories';
import type * as ComponentsService from '../services/components';
import type { createContentStructureService } from '../services/content-structure';
import type * as ContentTypesService from '../services/content-types';
import type * as SchemaService from '../services/schema';

/** Content-Type Builder services by name, as registered by the plugin. */
export type Services = {
  'api-handler': typeof ApiHandlerService;
  builder: typeof BuilderService;
  'component-categories': typeof ComponentCategoriesService;
  components: typeof ComponentsService;
  'content-structure': ReturnType<typeof createContentStructureService>;
  'content-types': typeof ContentTypesService;
  schema: typeof SchemaService;
};

/** Default contracts loaded with the Content-Type Builder server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::content-type-builder.api-handler': Services['api-handler'];
        'plugin::content-type-builder.builder': Services['builder'];
        'plugin::content-type-builder.component-categories': Services['component-categories'];
        'plugin::content-type-builder.components': Services['components'];
        'plugin::content-type-builder.content-structure': Services['content-structure'];
        'plugin::content-type-builder.content-types': Services['content-types'];
        'plugin::content-type-builder.schema': Services['schema'];
      }
    }
  }
}
