// Strict-off parity: root lookups after the declaration merging develop apps do. Compiled in its
// own program, because augmenting `Public.Services` narrows `UID.Service` for the whole program.
import type { Core, Schema, Struct } from '@strapi/strapi';

declare module '@strapi/strapi' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export module Public {
    export interface ContentTypeSchemas {
      'api::article.article': Struct.CollectionTypeSchema & {
        collectionName: 'articles';
        info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
        attributes: { title: Schema.Attribute.String };
      };
    }
    export interface Services {
      'api::article.article': { publish(id: string): Promise<void> };
    }
    export interface Controllers {
      'api::article.article': { find: Core.ControllerHandler };
    }
  }
}

declare const strapi: Core.Strapi;

// UIDs narrow to the declared keys.
strapi.controller('api::article.article');
// @ts-expect-error TS2345 an undeclared service UID
strapi.service('api::unknown.unknown');
// @ts-expect-error TS2345 an undeclared controller UID
strapi.controller('api::unknown.unknown');

// The lookup result stays `Core.Service`, not the declared entry.
const result = strapi.service('api::article.article');
result.anything();

// Documents keep their content type.
strapi.documents('api::article.article').findMany();
// @ts-expect-error TS2345 an undeclared content type
strapi.documents('api::unknown.unknown');

// Mocks still assign.
strapi.service = () => ({});
strapi.controller = () => ({});

export { result };
