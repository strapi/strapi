// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import { getService } from '../utils';

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
