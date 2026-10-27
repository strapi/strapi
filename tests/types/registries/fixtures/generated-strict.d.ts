import type { Struct } from '@strapi/strapi';

// The form type generation writes with `typescript.strictTypes` enabled.
declare global {
  namespace Strapi {
    namespace Registries {
      interface AppContentTypeSchemas {
        'api::article.article': Struct.CollectionTypeSchema;
      }
    }
  }
}
