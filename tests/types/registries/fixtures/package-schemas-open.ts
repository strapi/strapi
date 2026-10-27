// Strict mode with package schemas and no generated ones, as plugin code compiled alone sees it:
// declared UIDs are precise, every other UID stays generic.
import type { Core, Internal, Modules, Schema, UID, Utils } from '@strapi/strapi';

declare const app: Core.Strapi;

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type Declared = Strapi.Registries.PackageContentTypeSchemas;

const productFindFirst = () =>
  app.documents('plugin::catalog.product').findFirst({ populate: ['tags'] });
declare const product: Awaited<ReturnType<typeof productFindFirst>>;
const userFindFirst = () => app.documents('admin::user').findFirst();
// An `any` UID, such as a value read from `ctx.params`, matches no declared schema.
declare const anyUid: any;
const anyFindFirst = () => app.documents(anyUid).findFirst();

declare const checks: [
  Expect<Equal<Schema.ContentType<'plugin::catalog.product'>, Declared['plugin::catalog.product']>>,
  // The UID union stays open: other content types keep the generic UID.
  Expect<Equal<UID.ContentType, Internal.UID.ContentType>>,
  Expect<Equal<Utils.Constants.AreSchemaRegistriesExtended, false>>,
  Expect<Equal<Utils.Constants.IsSchemaRegistered<'plugin::catalog.product'>, true>>,
  Expect<Equal<Utils.Constants.IsSchemaRegistered<'admin::user'>, false>>,
  Expect<Equal<Modules.Documents.Document<'admin::user'>, Modules.Documents.AnyDocument>>,
  Expect<Equal<Awaited<ReturnType<typeof userFindFirst>>, Modules.Documents.AnyDocument | null>>,
  Expect<Equal<Utils.Constants.IsSchemaRegistered<any>, false>>,
  Expect<Equal<Modules.Documents.Document<any>, Modules.Documents.AnyDocument>>,
  Expect<Equal<Awaited<ReturnType<typeof anyFindFirst>>, Modules.Documents.AnyDocument | null>>,
];
checks satisfies unknown;

if (product !== null) {
  product.name satisfies string | null;
  product.tags satisfies Array<{ label?: string | null }>;
  // @ts-expect-error Not an attribute of plugin::catalog.product.
  void product.missing;
}
// @ts-expect-error Filters are checked against the declared schema.
void app.documents('plugin::catalog.product').findMany({ filters: { missing: { $eq: 1 } } });
// @ts-expect-error Writes are checked against the declared schema.
void app.documents('plugin::catalog.tag').create({ data: { missing: 'x' } });

// Content types no package declares accept any attribute.
void app.documents('api::article.article').findMany({ filters: { anything: { $eq: 1 } } });
const collectionType: UID.CollectionType = 'admin::user';
collectionType satisfies string;
export {};
