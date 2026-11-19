// The strict form of a generated schema file in a program without `Settings.strict`: a frontend, a
// types-only package, or a tsconfig that leaves `types/generated/strict.d.ts` out. The program
// reads the `Public` block and ignores the global block, as with strict types off.
import type { Modules, Schema, UID } from '@strapi/strapi';
import type { ArticleDocument, ArticleSchema, SeoSchema } from './schemas-without-switch-public';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppContentTypeSchemas {
        'api::article.article': ArticleSchema;
      }
      interface ComponentSchemas {
        'shared.seo': SeoSchema;
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type IsStrictProgram = Strapi.Registries.Settings extends { strict: true } ? true : false;
type Includes<TUnion, TMember> = TMember extends TUnion ? true : false;

declare const checks: [
  Expect<Equal<IsStrictProgram, false>>,
  Expect<Includes<UID.ContentType, 'api::article.article'>>,
  Expect<Includes<UID.Component, 'shared.seo'>>,
  Expect<Equal<Schema.ContentType<'api::article.article'>, ArticleSchema>>,
  Expect<Equal<Schema.Component<'shared.seo'>, SeoSchema>>,
  Expect<Equal<Equal<ArticleDocument, Modules.Documents.AnyDocument>, false>>,
  Expect<Includes<keyof ArticleDocument, 'title' | 'slug' | 'views'>>,
];
checks satisfies unknown;
