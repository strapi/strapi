import type { Struct } from '@strapi/strapi';

declare module '@strapi/strapi' {
  namespace Public {
    interface ContentTypeSchemas {
      'api::article.article': Struct.CollectionTypeSchema;
    }
  }
}
