// Strict mode with package and generated schemas: the generated entry wins for the same UID, the
// package entry fills the UIDs type generation did not write.
import type { Core, Schema, UID } from '@strapi/strapi';

declare const app: Core.Strapi;

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type Declared = Strapi.Registries.PackageContentTypeSchemas;
type Generated = Strapi.Registries.AppContentTypeSchemas;
// The schemas of bundled packages join the union when the program loads them (`i18n.d.ts`).
type Bundled = Extract<keyof Declared, 'plugin::i18n.locale'>;

const productFindFirst = () => app.documents('plugin::catalog.product').findFirst();
declare const product: Awaited<ReturnType<typeof productFindFirst>>;

declare const checks: [
  Expect<
    Equal<Schema.ContentType<'plugin::catalog.product'>, Generated['plugin::catalog.product']>
  >,
  Expect<Equal<Schema.ContentType<'plugin::catalog.tag'>, Declared['plugin::catalog.tag']>>,
  Expect<
    Equal<
      UID.ContentType,
      'admin::user' | 'plugin::catalog.product' | 'plugin::catalog.tag' | Bundled
    >
  >,
  Expect<Equal<UID.CollectionType, UID.ContentType>>,
];
checks satisfies unknown;

if (product !== null) {
  // The attribute the application added at runtime.
  product.credit satisfies string | null;
}
// @ts-expect-error The UID union is closed once type generation ran.
void app.documents('api::article.article');
export {};
