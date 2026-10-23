import type { Core } from '@strapi/strapi';
import type {
  ApiHandlerService,
  BuilderService,
  ComponentCategoriesService,
  ContentStructureService,
} from '@strapi/content-type-builder/strapi-server';

declare const app: Core.Strapi;

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
