// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core, Modules, Schema, UID } from '@strapi/types';
import type { RelationResult } from '../../../shared/contracts/relations';
import type { RegisteredControllers } from './controllers';

// Registered lookups, as applications with strict types make them.
const getService = <TName extends string>(name: TName) =>
  strapi.plugin('content-manager').service(name);

const structure = getService('content-structure').getContentStructure();
structure satisfies Promise<Modules.ContentStructure.ResolvedContentStructure | null>;
// @ts-expect-error An absent navigation file remains observable through the helper.
structure satisfies Promise<Modules.ContentStructure.ResolvedContentStructure>;
// @ts-expect-error Registered helper lookups have no catch-all member signature.
getService('content-structure').missing();

getService('uid').checkUIDAvailability({
  contentTypeUID: 'api::article.article',
  field: 'slug',
  value: 'article',
}) satisfies Promise<boolean>;
getService('uid').findUniqueUID({
  contentTypeUID: 'api::article.article',
  field: 'slug',
  // @ts-expect-error UID values are strings through the internal helper too.
  value: 2,
});

const builder = getService('populate-builder')('api::article.article');
builder.populateFromQuery({}).countRelations({ toMany: true }).populateDeep().build();
// @ts-expect-error Builder depth must be numeric.
builder.populateDeep('all');
// @ts-expect-error The service is callable, but the builder has no arbitrary methods.
builder.missing();

getService('document-manager').findOne('document', 'api::article.article');
// @ts-expect-error Document identifiers are strings.
getService('document-manager').findOne(1, 'api::article.article');
getService('document-manager').findLocales('document', 'api::article.article', {
  populate: { author: true },
});
const page = getService('document-manager').findPage(
  { page: '2', pageSize: '10', hasPublishedVersion: 'true', locale: 'en' },
  'api::article.article'
);
page.then((result) => result.pagination.pageSize) satisfies Promise<number>;
getService('document-manager').findPage({ start: 0, limit: 10 }, 'api::article.article');
// @ts-expect-error Page and offset pagination cannot be mixed.
getService('document-manager').findPage({ page: '2', start: 0 }, 'api::article.article');
getService('document-manager').countDraftRelations('document', 'api::article.article', undefined);
// @ts-expect-error A given locale is a string.
getService('document-manager').countDraftRelations('document', 'api::article.article', 1);

const status = getService('document-metadata').getStatus({ documentId: 'document' });
status satisfies 'draft' | 'published' | 'modified';
({ documentId: 'document', id: 1, status }) satisfies RelationResult;
// @ts-expect-error Metadata version input cannot be missing.
getService('document-metadata').getMetadata('api::article.article', null);

const metadata = getService('document-metadata');
const rows = metadata.getManyAvailableStatus('api::article.article', [
  { id: 1, documentId: 'document', locale: null, publishedAt: null },
]);
rows satisfies Promise<{ documentId: string; locale: string | null; publishedAt: string | null }[]>;
// @ts-expect-error Version rows are typed, not `any`.
rows satisfies Promise<{ documentId: number }[]>;
const formatted = metadata.formatDocumentWithMetadata('api::article.article', {
  id: 1,
  documentId: 'document',
  locale: null,
  title: 'Hello',
});
formatted satisfies Promise<{
  data: { title: string; status: 'draft' | 'published' | 'modified' | undefined };
  meta: { availableLocales: { locale: string | null; status?: string }[] };
}>;
// @ts-expect-error Available locales are typed, not `any`.
formatted satisfies Promise<{ meta: { availableLocales: { locale: number }[] } }>;

const contentTypes = getService('content-types');
contentTypes.findConfiguration({ uid: 'api::article.article' }) satisfies Promise<{
  uid: UID.ContentType;
  settings: { mainField: string; pageSize: number };
}>;
// @ts-expect-error Configuration results are typed, not `any`.
contentTypes.findConfiguration({ uid: 'api::article.article' }) satisfies Promise<{ uid: number }>;
contentTypes.updateConfiguration({ uid: 'api::article.article' }, { options: {} });
contentTypes.findContentTypesByKind('singleType');
contentTypes.findContentTypesByKind(undefined);
// @ts-expect-error The kind is passed as is, not wrapped in an object.
contentTypes.findContentTypesByKind({ kind: 'singleType' });
const article = contentTypes.findContentType('api::article.article');
article?.attributes.author?.relationType satisfies Schema.Attribute.RelationKind.Any | undefined;
// @ts-expect-error Model attributes are attribute definitions, not `any`.
article?.attributes.title?.missing satisfies unknown;

const components = getService('components');
components.findConfiguration({ uid: 'shared.seo', category: 'shared' }) satisfies Promise<{
  uid: UID.Component;
  category: string;
  isComponent: boolean;
}>;
// @ts-expect-error A component configuration is read by UID and category.
components.findConfiguration({ uid: 'shared.seo' });

// @ts-expect-error Unregistered helper lookups resolve to `never` with strict types enabled.
getService('unregistered').custom();

({
  type: 'admin',
  routes: [{ method: 'GET', path: '/', handler: 'init.getInitData' }],
}) satisfies Core.RouterInputFor<RegisteredControllers, 'plugin::content-manager'>;
({
  type: 'admin',
  // @ts-expect-error Route actions are checked against registered controller contracts.
  routes: [{ method: 'GET', path: '/', handler: 'init.getInitDta' }],
}) satisfies Core.RouterInputFor<RegisteredControllers, 'plugin::content-manager'>;

// Feature controllers are registered too. History only exists with the `cms-content-history` feature.
strapi.controller('plugin::content-manager.homepage')
  .getRecentDocuments satisfies Core.ControllerHandler;
strapi.controller('plugin::content-manager.preview').getPreviewUrl satisfies Core.ControllerHandler;
strapi.controller('plugin::content-manager.history-version')?.findMany satisfies
  Core.ControllerHandler | undefined;
// @ts-expect-error Registered feature controllers have no arbitrary actions.
strapi.controller('plugin::content-manager.preview').missing();
// History services only exist with the `cms-content-history` feature.
// @ts-expect-error The service may be undefined.
strapi.plugin('content-manager').service('history').findVersionsPage satisfies unknown;
