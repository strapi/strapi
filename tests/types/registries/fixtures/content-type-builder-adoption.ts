import type { Core, Struct } from '@strapi/strapi';
import type {
  ApiHandlerService,
  BuilderService,
  ComponentCategoriesService,
  ComponentHandler,
  ComponentsService,
  ContentStructureService,
  ContentTypeHandler,
  ContentTypesService,
  Controllers,
  SchemaController,
  SchemaService,
} from '@strapi/content-type-builder/strapi-server';

declare const app: Core.Strapi;
declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

const apiHandler = app.plugin('content-type-builder').service('api-handler');
apiHandler satisfies ApiHandlerService;
apiHandler.finalize('api::article.article') satisfies Promise<void>;
// @ts-expect-error API folders are backed up by content type uid.
apiHandler.backup(1);

const builder = app.service('plugin::content-type-builder.builder');
builder satisfies BuilderService;
builder.getReservedNames().models satisfies string[];
// @ts-expect-error Registered services have no arbitrary members.
builder.missing();

const categories = app.plugin('content-type-builder').service('component-categories');
categories satisfies ComponentCategoriesService;
const renamed = categories.editCategory('shared', { name: 'common' });
renamed satisfies Promise<string | undefined>;
// @ts-expect-error An unchanged name resolves to `undefined`.
renamed satisfies Promise<string>;

const contentStructure = app.service('plugin::content-type-builder.content-structure');
contentStructure satisfies ContentStructureService;
contentStructure.commitFromUpdate({
  incomingStructure: undefined,
  deletedUids: new Set(['api::article.article']),
}) satisfies Promise<boolean>;
// @ts-expect-error Deleted uids are a set.
contentStructure.commitFromUpdate({ deletedUids: ['api::article.article'] });

const contentTypes = app.plugin('content-type-builder').service('content-types');
contentTypes satisfies ContentTypesService;
const created = contentTypes.createContentType({
  contentType: {
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
    attributes: { title: { type: 'string' } },
  },
});
created satisfies Promise<ContentTypeHandler>;
created.then((handler) => {
  // @ts-expect-error Mutation results have no handler methods.
  handler.rollback();
});
app
  .service('plugin::content-type-builder.content-types')
  .formatContentType(app.contentType('api::article.article')).schema.visible satisfies boolean;
contentTypes.createContentType({
  // @ts-expect-error A content type payload sends its attributes.
  contentType: { displayName: 'Tag', singularName: 'tag', pluralName: 'tags' },
});

const components = app.plugin('content-type-builder').service('components');
components satisfies ComponentsService;
components.createComponent({
  component: { category: 'shared', displayName: 'Seo', attributes: { title: { type: 'string' } } },
}) satisfies Promise<ComponentHandler>;
declare const seo: Struct.ComponentSchema;
app.service('plugin::content-type-builder.components').formatComponent(seo).schema
  .description satisfies string;
// @ts-expect-error An update sends the builder payload, with the `info` fields at the top level.
components.editComponent('shared.seo', { component: seo });

const schema = app.service('plugin::content-type-builder.schema');
schema satisfies SchemaService;
schema.renameAttribute('api::article.article', 'title', 'heading') satisfies Promise<void>;
app.eventHub.on('component.delete', ({ component }) => {
  component.category satisfies string | undefined;
  // @ts-expect-error Event payloads have no handler methods.
  component.rollback();
});

app.plugin('content-type-builder').controller('content-types').getContentType(context, next);
app.controller('plugin::content-type-builder.components').updateComponent(context, next);
app.plugin('content-type-builder').controller('schema') satisfies SchemaController;
// @ts-expect-error Registry controller actions do not accept misspelled names.
app.controller('plugin::content-type-builder.builder').getReservedName(context, next);

({
  type: 'admin',
  routes: [{ method: 'GET', path: '/schema', handler: 'schema.getSchema' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::content-type-builder'>;
({
  type: 'admin',
  // @ts-expect-error Route actions are checked against the controller contracts.
  routes: [{ method: 'GET', path: '/schema', handler: 'schema.getSchemas' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::content-type-builder'>;
