// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core, Modules } from '@strapi/types';
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

const status = getService('document-metadata').getStatus({ documentId: 'document' });
status satisfies 'draft' | 'published' | 'modified';
({ documentId: 'document', id: 1, status }) satisfies RelationResult;
// @ts-expect-error Metadata version input cannot be missing.
getService('document-metadata').getMetadata('api::article.article', null);

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
