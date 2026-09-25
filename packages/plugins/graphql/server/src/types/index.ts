import type createBuilders from '../services/builders';
import type createConstants from '../services/constants';
import type createContentAPI from '../services/content-api';
import type createExtension from '../services/extension';
import type createFormat from '../services/format';
import type createInternals from '../services/internals';
import type createTypeRegistry from '../services/type-registry';
import type createUtils from '../services/utils';

/** GraphQL services by name, as registered by the plugin. */
export type Services = {
  builders: ReturnType<typeof createBuilders>;
  constants: ReturnType<typeof createConstants>;
  'content-api': ReturnType<typeof createContentAPI>;
  extension: ReturnType<typeof createExtension>;
  format: ReturnType<typeof createFormat>;
  internals: ReturnType<typeof createInternals>;
  'type-registry': ReturnType<typeof createTypeRegistry>;
  utils: ReturnType<typeof createUtils>;
};

/** Default contracts loaded with the GraphQL server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::graphql.builders': Services['builders'];
        'plugin::graphql.constants': Services['constants'];
        'plugin::graphql.content-api': Services['content-api'];
        'plugin::graphql.extension': Services['extension'];
        'plugin::graphql.format': Services['format'];
        'plugin::graphql.internals': Services['internals'];
        'plugin::graphql.type-registry': Services['type-registry'];
        'plugin::graphql.utils': Services['utils'];
      }
    }
  }
}
