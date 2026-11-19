// Server entries of the packages an application installs (providers of services, controllers and
// content types). The harness prints every type exported here that `surface-core.ts` does not reach,
// and reports differences with the baseline without failing: provider types may only widen.
// Server entries are imported by their declaration path: `moduleResolution: node` (the app template's
// until https://github.com/strapi/strapi/pull/25873 moves it to `bundler`) does not read `exports`.
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
