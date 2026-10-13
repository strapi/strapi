// Public types a strict-off v5 app can reach. The harness prints every type exported here, and every
// Strapi-declared type they reference, so the dumps of the baseline and head checkouts can be diffed.
// Server entries are imported by their declaration path: `moduleResolution: node` (the app template's)
// does not read `exports`.
import type { Core, Data, Modules, Schema, Struct, UID } from '@strapi/strapi';
import type adminServer from '@strapi/admin/dist/server/src';
import type uploadServer from '@strapi/upload/dist/server/src';
import type contentManagerServer from '@strapi/content-manager/dist/server/src';
import type contentReleasesServer from '@strapi/content-releases/dist/server/src';
import type contentTypeBuilderServer from '@strapi/content-type-builder/dist/server/src';
import type emailServer from '@strapi/email/dist/server/src';
import type reviewWorkflowsServer from '@strapi/review-workflows/dist/server/src';
import type i18nServer from '@strapi/i18n/dist/server/src';
import type graphqlServer from '@strapi/plugin-graphql/dist/server/src';
import type documentationServer from '@strapi/plugin-documentation/dist/server/src';
import type sentryServer from '@strapi/plugin-sentry/dist/server/src';
import type articleService from '../src/api/article/services/article';
import type articleController from '../src/api/article/controllers/article';
import type articleRouter from '../src/api/article/routes/article';

export type ProbeStrapi = Core.Strapi;
export type ProbeConfig = {
  server: Core.Config.Server;
  admin: Core.Config.Admin;
  api: Core.Config.Api;
  middlewares: Core.Config.Middlewares;
  plugin: Core.Config.Plugin;
  database: Core.Config.Database;
};
export type ProbeUIDs = {
  contentType: UID.ContentType;
  component: UID.Component;
  service: UID.Service;
  controller: UID.Controller;
  policy: UID.Policy;
  middleware: UID.Middleware;
};
export type ProbeArticleSchema = Schema.ContentType<'api::article.article'>;
export type ProbeSeoSchema = Schema.Component<'shared.seo'>;
export type ProbeArticleData = Data.ContentType<'api::article.article'>;
export type ProbeContentTypeSchema = Struct.ContentTypeSchema;
export type ProbeDocuments = Modules.Documents.ServiceInstance<'api::article.article'>;
export type ProbeFindMany = Awaited<ReturnType<ProbeDocuments['findMany']>>;
export type ProbeCoreService = ReturnType<typeof articleService>;
export type ProbeCoreController = ReturnType<typeof articleController>;
export type ProbeCoreRouter = typeof articleRouter;
export type ProbeService = ReturnType<Core.Strapi['service']>;
export type ProbeHandlers = {
  policy: Core.PolicyHandler;
  middleware: Core.MiddlewareFactory;
  controller: Core.ControllerHandler;
};
export type ProbeAdminServer = typeof adminServer;
export type ProbeUploadServer = ReturnType<typeof uploadServer>;
export type ProbeContentManagerServer = ReturnType<typeof contentManagerServer>;
/** A server entry exports the plugin, or a function returning it. */
type ServerEntry<T> = T extends (...args: any[]) => infer TPlugin ? TPlugin : T;
export type ProbeContentReleasesServer = ServerEntry<typeof contentReleasesServer>;
export type ProbeContentTypeBuilderServer = ServerEntry<typeof contentTypeBuilderServer>;
export type ProbeEmailServer = ServerEntry<typeof emailServer>;
export type ProbeReviewWorkflowsServer = ServerEntry<typeof reviewWorkflowsServer>;
export type ProbeI18nServer = ServerEntry<typeof i18nServer>;
export type ProbeGraphqlServer = ServerEntry<typeof graphqlServer>;
export type ProbeDocumentationServer = ServerEntry<typeof documentationServer>;
export type ProbeSentryServer = ServerEntry<typeof sentryServer>;
export type ProbeLookups = ReturnType<typeof import('./usage').pluginServices>;
