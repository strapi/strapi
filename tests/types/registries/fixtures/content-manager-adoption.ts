import type { Core, Modules } from '@strapi/strapi';
import type { Controllers, Services } from '@strapi/content-manager/strapi-server';
import type {} from '@strapi/admin/strapi-server';

declare const app: Core.Strapi;

const documents = app.plugin('content-manager').service('document-manager');
const document = documents.findOne('document', 'api::article.article');
document satisfies Promise<Modules.Documents.AnyDocument | null>;
// @ts-expect-error Document lookups can miss.
document satisfies Promise<Modules.Documents.AnyDocument>;
// @ts-expect-error Full UID lookups preserve argument contracts.
app.service('plugin::content-manager.document-manager').findOne(1, 'api::article.article');
// @ts-expect-error Registered document services have no arbitrary methods.
documents.missing();
documents.findLocales('document', 'api::article.article', { populate: { author: true } });

const metadata = app.plugin('content-manager').service('document-metadata');
metadata.getStatus({ documentId: 'document', publishedAt: null }) satisfies
  | 'draft'
  | 'published'
  | 'modified';
// @ts-expect-error Version metadata requires a document, not null.
metadata.getMetadata('api::article.article', null);

const structure = app.service('plugin::content-manager.content-structure').getContentStructure();
structure satisfies Promise<Modules.ContentStructure.ResolvedContentStructure | null>;
// @ts-expect-error The navigation file can be absent.
structure satisfies Promise<Modules.ContentStructure.ResolvedContentStructure>;

const uid = app.plugin('content-manager').service('uid');
uid.generateUIDField({
  contentTypeUID: 'api::article.article',
  field: 'slug',
  data: {},
}) satisfies Promise<string>;
// @ts-expect-error The UID value must be a string.
uid.checkUIDAvailability({ contentTypeUID: 'api::article.article', field: 'slug', value: 3 });

const fields = app.plugin('content-manager').service('field-sizes');
fields.getFieldSize('string').default satisfies number;
// @ts-expect-error A field size is an object with a default size.
fields.setFieldSize('string', 12);
const metrics = app.plugin('content-manager').service('metrics');
// @ts-expect-error A configuration event requires its content type and configuration.
metrics.sendDidConfigureListView();

const builder = app.service('plugin::content-manager.populate-builder')('api::article.article');
builder
  .populateFromQuery({})
  .populateDeep()
  .countRelations({ toOne: false })
  .build() satisfies Promise<Services.Populate | undefined>;
// @ts-expect-error A fresh builder has no population yet.
builder.build() satisfies Promise<Services.Populate>;
// @ts-expect-error Populate depth is numeric.
builder.populateDeep('all');
// @ts-expect-error Registered builders have no arbitrary chain methods.
builder.missing();

app.plugin('content-manager').controller('collection-types')
  .findOne satisfies Core.ControllerHandler;
app.controller('plugin::content-manager.components')
  .findComponents satisfies Core.ControllerHandler;
app.controller('plugin::content-manager.content-types')
  .findContentTypes satisfies Core.ControllerHandler;
app.controller('plugin::content-manager.init').getInitData satisfies Core.ControllerHandler;
app.controller('plugin::content-manager.relations').findExisting satisfies Core.ControllerHandler;
app.controller('plugin::content-manager.single-types')
  .createOrUpdate satisfies Core.ControllerHandler;
app.controller('plugin::content-manager.uid').generateUID satisfies Core.ControllerHandler;
// @ts-expect-error Registered controller actions reject typos.
app.plugin('content-manager').controller('collection-types').findOn satisfies unknown;

({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/init',
      handler: 'init.getInitData',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'hasPermissions',
          {
            name: 'hasPermissions',
            config: { actions: ['read'], hasAtLeastOne: true },
          },
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers.RegisteredControllers, 'plugin::content-manager'>;
({
  // @ts-expect-error Relative policy references enforce the registered boolean option.
  policies: [{ name: 'hasPermissions', config: { hasAtLeastOne: 'yes' } }],
}) satisfies Core.RouteConfigFor<'plugin::content-manager'>;
({
  // @ts-expect-error The complete policy inventory rejects unknown relative policy names.
  policies: ['hasPermission'],
}) satisfies Core.RouteConfigFor<'plugin::content-manager'>;

// Services and controllers outside this adoption slice resolve to `never`; explicit generics remain.
const unregisteredService = app.plugin('content-manager').service('unregistered');
unregisteredService satisfies never;
const unregisteredController = app.plugin('content-manager').controller('unregistered');
unregisteredController satisfies never;
app.plugin('content-manager').service<{ custom(): void }>('unregistered').custom();
