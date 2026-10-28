// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Schema } from '@strapi/types';
import type { ReleaseActionSchema, ReleaseSchema } from './content-types';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const checks: [
  Expect<Equal<Schema.ContentType<'plugin::content-releases.release'>, ReleaseSchema>>,
  Expect<Equal<Schema.ContentType<'plugin::content-releases.release-action'>, ReleaseActionSchema>>,
];
checks satisfies unknown;

// The plugin declares its content-type schemas: the Document Service reads them without type
// generation. They exist whatever the license, so the Document Service never resolves to
// `undefined`, unlike the services.
const release = await strapi
  .documents('plugin::content-releases.release')
  .findFirst({ populate: ['actions'] });
if (release !== null) {
  release.name satisfies string | null;
  release.status satisfies 'ready' | 'blocked' | 'failed' | 'done' | 'empty' | null;
  release.scheduledAt satisfies string | null | undefined;
  release.actions satisfies Array<{ type?: 'publish' | 'unpublish' | null }>;
  // @ts-expect-error Not an attribute of plugin::content-releases.release.
  release.missing satisfies unknown;
}
// @ts-expect-error Filters are checked against the declared schema.
strapi.documents('plugin::content-releases.release').findMany({ filters: { missing: { $eq: 1 } } });
strapi.documents('plugin::content-releases.release-action').create({
  data: { type: 'publish', contentType: 'api::article.article', entryDocumentId: 'abc' },
});
strapi.documents('plugin::content-releases.release-action').create({
  // @ts-expect-error Writes are checked against the declared schema.
  data: { type: 'archive', contentType: 'api::article.article' },
});
strapi.getModel('plugin::content-releases.release-action').attributes
  .release satisfies ReleaseActionSchema['attributes']['release'];
// Content types no package declares stay generic.
strapi.documents('api::article.article').findMany({ filters: { anything: { $eq: 1 } } });
