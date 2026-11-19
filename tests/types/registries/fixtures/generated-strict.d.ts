import type { Struct } from '@strapi/strapi';

// The form type generation writes with `typescript.strictTypes` enabled: global registries for
// strict programs, `Public` for programs without the switch.
declare global {
  namespace Strapi {
    namespace Registries {
      interface AppContentTypeSchemas {
        'api::article.article': Struct.CollectionTypeSchema;
      }
    }
  }
}

declare module '@strapi/strapi' {
  namespace Public {
    interface ContentTypeSchemas {
      'api::article.article': Struct.CollectionTypeSchema;
    }
  }
}
