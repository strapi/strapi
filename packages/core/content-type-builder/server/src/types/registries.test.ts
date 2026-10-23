// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core, Schema, Struct } from '@strapi/types';
import { getService } from '../utils';
import isDevelopmentMode from '../middlewares/is-development-mode';
import type { Controllers } from './controllers';
import type { ContentTypeHandler } from './services';

declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

const apiHandler = strapi.plugin('content-type-builder').service('api-handler');
apiHandler.backup('api::article.article') satisfies Promise<void>;
apiHandler.clear('api::article.article', { preserveBackup: true }) satisfies Promise<void>;
apiHandler.clearGenerated('article') satisfies Promise<void>;
// @ts-expect-error API folders are backed up by content type uid.
apiHandler.rollback(1);
// @ts-expect-error Registered services have no arbitrary members.
apiHandler.missing();

const builder = strapi.service('plugin::content-type-builder.builder');
builder.getReservedNames().attributes satisfies string[];
builder.reservedModels satisfies string[];
builder.isReservedAttributeName('id') satisfies boolean;
// @ts-expect-error Reserved names are strings.
builder.isReservedModelName(1);

const renamed = getService('component-categories').editCategory('shared', { name: 'common' });
renamed satisfies Promise<string | undefined>;
// @ts-expect-error An unchanged name resolves to `undefined`.
renamed satisfies Promise<string>;
// @ts-expect-error The new category is given as `{ name }`.
getService('component-categories').editCategory('shared', 'common');

const contentStructure = getService('content-structure');
contentStructure.validateFromUpdate({
  incomingStructure: null,
  upsertedUids: new Map([['api::article.article', 'singleType']]),
  deletedUids: new Set(),
});
contentStructure.commitFromUpdate({ deletedUids: new Set() }) satisfies Promise<boolean>;
// @ts-expect-error Deleted uids are a set.
contentStructure.commitFromUpdate({ deletedUids: ['api::article.article'] });
contentStructure.validateContentTypeUidReferences(
  {},
  // @ts-expect-error Content types are collection or single types.
  new Map([['api::article.article', 'component']])
);

(() => ({
  validateContentTypeUidReferences() {},
  validateFromUpdate() {},
  // @ts-expect-error The factory is checked against the registered contract.
  commitFromUpdate: async () => 'written',
})) satisfies Core.ServiceFactory<'plugin::content-type-builder.content-structure'>;

const contentTypes = getService('content-types');
declare const loaded: Struct.ContentTypeSchema;
declare const attribute: Schema.Attribute.AnyAttribute;
const formatted = contentTypes.formatContentType(loaded);
formatted.schema.restrictRelationsTo satisfies string[] | null;
Object.values(formatted.schema.attributes).forEach((formattedAttribute) => {
  if (formattedAttribute.type === 'relation') {
    formattedAttribute.targetAttribute satisfies string | null;
  }
});
// @ts-expect-error Formatted content types are read from a loaded schema.
contentTypes.formatContentType({ uid: 'api::article.article' });

const created = contentTypes.createContentType({
  contentType: {
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
    kind: 'collectionType',
    attributes: { title: { type: 'string', required: true }, cover: attribute },
  },
  components: [
    {
      tmpUID: 'tmp.card',
      category: 'shared',
      displayName: 'Card',
      attributes: {
        article: { type: 'relation', relation: 'oneToOne', target: '__contentType__' },
      },
    },
  ],
});
created satisfies Promise<ContentTypeHandler>;
created.then((handler) => {
  handler.kind satisfies Struct.ContentTypeKind;
  handler.schema.info.singularName satisfies string;
  // @ts-expect-error Mutation results are read-only views.
  handler.uid = 'api::other.other';
  // @ts-expect-error Mutation results have no handler methods.
  handler.flush();
});
contentTypes.createContentTypes([
  {
    contentType: {
      displayName: 'Tag',
      singularName: 'tag',
      pluralName: 'tags',
      attributes: { name: { type: 'string' } },
    },
    components: [
      // @ts-expect-error A nested component has a uid or a temporary uid, not both.
      {
        uid: 'shared.card',
        tmpUID: 'tmp.card',
        category: 'shared',
        displayName: 'Card',
        attributes: {},
      },
    ],
  },
]) satisfies Promise<ContentTypeHandler[]>;
contentTypes.editContentType('api::article.article', {
  contentType: { attributes: { title: { type: 'text' } } },
  components: undefined,
}) satisfies Promise<ContentTypeHandler>;
// @ts-expect-error An update replaces the attributes, so it sends them.
contentTypes.editContentType('api::article.article', { contentType: { displayName: 'Post' } });
contentTypes.deleteContentType('api::article.article') satisfies Promise<ContentTypeHandler>;
// @ts-expect-error The schema builder is not part of the contract.
contentTypes.deleteContentType('api::article.article', {});
contentTypes.deleteContentTypes(['api::article.article']) satisfies Promise<void>;
contentTypes.generateAPI({
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  // @ts-expect-error Generated APIs are for collection or single types.
  kind: 'component',
});
contentTypes.getRestrictRelationsTo(loaded) satisfies string[] | null;

strapi.controller('plugin::content-type-builder.content-types').getContentTypes(context, next);
strapi.plugin('content-type-builder').controller('schema').getUpdateSchemaStatus(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('content-type-builder').controller('components').missing(context, next);

(() => ({
  getSchema() {},
  updateSchema() {},
  // @ts-expect-error The factory is checked against the registered contract.
  getUpdateSchemaStatus: { isUpdating: false },
})) satisfies Core.ControllerFactory<'plugin::content-type-builder.schema'>;

({
  type: 'admin',
  routes: [
    {
      method: 'PUT',
      path: '/component-categories/:name',
      handler: 'component-categories.editCategory',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode, 'plugin::content-type-builder.isDevelopmentMode'],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::content-type-builder'>;
({
  type: 'content-api',
  // @ts-expect-error Route actions are checked against the controller contracts.
  routes: [{ method: 'GET', path: '/components', handler: 'components.getComponentList' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::content-type-builder'>;
