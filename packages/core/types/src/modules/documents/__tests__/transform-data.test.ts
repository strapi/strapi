import type { Modules } from '../../..';
import type { Equal, Expect } from '../../../../tests/helpers/assert';

// With strict types, `strapi.documents.utils.transformData` takes the data of a document as an
// object, and the options `transform/*` in `@strapi/core` read. It resolves to that data with its
// relation document ids replaced by entry ids: an object whose values are `unknown`. The data holds
// no `documentId` or `id` unless the caller gave them, as i18n's non-localized attributes do not.

type IsAny<T> = 0 extends 1 & T ? true : false;
type TransformData = Modules.Documents.Service['utils']['transformData'];
type Data = Parameters<TransformData>[0];
type Options = Parameters<TransformData>[1];
type Result = Awaited<ReturnType<TransformData>>;

declare const transformDataChecks: [
  Expect<Equal<IsAny<Data>, false>>,
  Expect<Equal<Data, Record<string, unknown>>>,
  Expect<Equal<IsAny<Options>, false>>,
  Expect<Equal<Options, Modules.Documents.TransformDataOptions>>,
  Expect<Equal<IsAny<Result>, false>>,
  Expect<Equal<Result, Record<string, unknown>>>,
];
transformDataChecks satisfies unknown;

declare const transformData: TransformData;
declare const locale: string;

const transformDataCalls = async () => {
  // i18n syncs the non-localized attributes of every other locale with this call.
  const result = await transformData(
    { title: 'Title', tags: [{ documentId: 'abc' }] },
    { uid: 'api::article.article', status: 'draft', locale, allowMissingId: true }
  );
  // The document service passes the locale and status of the query, which may be absent.
  await transformData({}, { uid: 'api::article.article', locale: null, status: undefined });
  // A request may skip the cache of document ids it shares with other calls.
  await transformData({}, { uid: 'default.seo', useRequestCache: false });

  // @ts-expect-error The options name the schema of the data.
  await transformData({}, { locale });
  // @ts-expect-error `status` is `draft` or `published`.
  await transformData({}, { uid: 'api::article.article', status: 'modified' });
  // @ts-expect-error The data is an object.
  await transformData('title', { uid: 'api::article.article' });

  // @ts-expect-error The result holds no `documentId` the runtime promises.
  result.documentId satisfies string;
  if (typeof result.title === 'string') {
    result.title satisfies string;
  }
};
transformDataCalls satisfies unknown;
