import type { Core, Modules, Schema, Struct } from '@strapi/strapi';
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
const locales = documents.findLocales('document', 'api::article.article', {
  populate: { author: true },
});
locales.then((rows) => rows.map((row) => row.documentId)) satisfies Promise<string[]>;
// @ts-expect-error Locale rows are documents, not `any`.
locales satisfies Promise<{ documentId: number }[]>;
documents
  .findPage({ page: '1', pageSize: '10' }, 'api::article.article')
  .then((result) => result.pagination.page) satisfies Promise<number>;
documents.countDraftRelations('document', 'api::article.article');
// @ts-expect-error A given locale is a string.
documents.countDraftRelations('document', 'api::article.article', 1);

const metadata = app.plugin('content-manager').service('document-metadata');
metadata.getStatus({ documentId: 'document', publishedAt: null }) satisfies
  'draft' | 'published' | 'modified';
// @ts-expect-error Version metadata requires a document, not null.
metadata.getMetadata('api::article.article', null);
const availableLocales = metadata
  .getMetadata('api::article.article', { documentId: 'document', locale: 'en' })
  .then((result) => result.availableLocales);
availableLocales satisfies Promise<Services.AvailableLocale[]>;
availableLocales.then((locales) => locales.map((locale) => locale.locale)) satisfies Promise<
  (string | null)[]
>;
// @ts-expect-error Available locales are typed, not `any`.
availableLocales satisfies Promise<{ locale: number }[]>;

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
fields.hasFieldSize(undefined) satisfies boolean;
const metrics = app.plugin('content-manager').service('metrics');
// @ts-expect-error A configuration event requires its content type and configuration.
metrics.sendDidConfigureListView();

const preview = app.plugin('content-manager').service('preview');
preview.getPreviewUrl('api::article.article', {
  documentId: 'document',
  status: 'published',
}) satisfies Promise<string | null | undefined>;
// @ts-expect-error The document version needs its publication status.
preview.getPreviewUrl('api::article.article', { documentId: 'document', locale: 'en' });
declare const contentType: Struct.ContentTypeSchema;
app.service('plugin::content-manager.permission').canConfigureContentType({
  // @ts-expect-error Configuration checks take a user ability, not any value.
  userAbility: {},
  contentType,
});

const contentTypes = app.plugin('content-manager').service('content-types');
contentTypes
  .findConfiguration({ uid: 'api::article.article' })
  .then((configuration) => configuration.settings.mainField) satisfies Promise<string>;
contentTypes.updateConfiguration(
  { uid: 'api::article.article' },
  { options: {} }
) satisfies Promise<Services.ContentTypeConfiguration>;
contentTypes.findContentTypesByKind('collectionType');
// @ts-expect-error The kind is passed as is, not wrapped in an object.
contentTypes.findContentTypesByKind({ kind: 'collectionType' });
app
  .service('plugin::content-manager.components')
  .findAllComponents()
  .flatMap((component) => Object.values(component.attributes))
  .map((attribute) => attribute.type) satisfies Schema.Attribute.Kind[];
const seo = app.plugin('content-manager').service('components').findConfiguration({
  uid: 'shared.seo',
  category: 'shared',
});
seo satisfies Promise<Services.ComponentModelConfiguration>;
// @ts-expect-error Component configurations are not content type configurations.
seo satisfies Promise<Services.ContentTypeConfiguration>;

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

const versions = app
  .service('plugin::content-manager.history')
  ?.findVersionsPage({ query: { contentType: 'api::article.article' }, state: { userAbility: {} } })
  .then((page) => page.results);
versions satisfies Promise<Services.HistoryVersionResult[]> | undefined;
const versionTitles = versions?.then((results) => results.map(({ data: { title } }) => title));
// @ts-expect-error Version values are `unknown`, not `any`.
versionTitles satisfies Promise<string[]> | undefined;
app.plugin('content-manager').service('lifecycles')?.destroy() satisfies Promise<void> | undefined;

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
app.controller('plugin::content-manager.homepage')
  .getCountDocuments satisfies Core.ControllerHandler;
app.plugin('content-manager').controller('preview')
  .getPreviewScript satisfies Core.ControllerHandler;
// @ts-expect-error Feature controller contracts are hand-written: no arbitrary actions.
app.controller('plugin::content-manager.homepage').getRecentDocument satisfies unknown;
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
  type: 'admin',
  // @ts-expect-error Feature routes are checked against the feature controller contracts.
  routes: [{ method: 'GET', path: '/', handler: 'homepage.getRecentDocument' }],
}) satisfies Core.RouterInputFor<Controllers.RegisteredControllers, 'plugin::content-manager'>;
({
  // @ts-expect-error Relative policy references enforce the registered boolean option.
  policies: [{ name: 'hasPermissions', config: { hasAtLeastOne: 'yes' } }],
}) satisfies Core.RouteConfigFor<'plugin::content-manager'>;
({
  // @ts-expect-error The complete policy inventory rejects unknown relative policy names.
  policies: ['hasPermission'],
}) satisfies Core.RouteConfigFor<'plugin::content-manager'>;

// Services and controllers outside this adoption slice have no members; explicit generics remain.
// @ts-expect-error Unregistered services resolve to `unknown`.
app.plugin('content-manager').service('unregistered').anything();
// @ts-expect-error Unregistered controllers resolve to `unknown`.
app.plugin('content-manager').controller('unregistered').anything satisfies unknown;
app.plugin('content-manager').service<{ custom(): void }>('unregistered').custom();
