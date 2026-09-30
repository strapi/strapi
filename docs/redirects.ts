import type { Options as ClientRedirectsOptions } from '@docusaurus/plugin-client-redirects';

/**
 * Client-side redirects for moved or removed pages (`{ from: '/old-path', to: '/new-path' }`).
 * Generated once from the before/after permalinks of the content restructure; add new entries by
 * hand when a page moves. Never list a `from` that is still a route (the plugin ignores it).
 *
 * The RFCs section was removed: RFCs now live in GitHub Discussions.
 */
export const redirects: NonNullable<ClientRedirectsOptions['redirects']> = [
  { from: '/database', to: '/packages/core/database/' },
  { from: '/docs/core/admin/ee/audit-logs', to: '/packages/core/admin/ee/audit-logs' },
  {
    from: '/docs/core/admin/ee/hooks/use-license-limits',
    to: '/packages/core/admin/ee/hooks/use-license-limits',
  },
  { from: '/docs/core/admin/ee/intro', to: '/architecture/enterprise-edition' },
  { from: '/docs/core/admin/ee/review-workflows', to: '/packages/core/review-workflows/backend' },
  {
    from: '/docs/core/admin/features/hooks/use-admin-roles',
    to: '/packages/core/admin/features/hooks/use-admin-roles',
  },
  {
    from: '/docs/core/admin/features/hooks/use-document',
    to: '/packages/core/content-manager/hooks/use-document',
  },
  {
    from: '/docs/core/admin/features/hooks/use-enterprise',
    to: '/packages/core/admin/features/hooks/use-enterprise',
  },
  { from: '/docs/core/admin/features/nps', to: '/packages/core/admin/features/nps' },
  { from: '/docs/core/admin/features/telemetry', to: '/packages/core/admin/features/telemetry' },
  { from: '/docs/core/admin/guided-tour', to: '/packages/core/admin/guided-tour' },
  { from: '/docs/core/admin/intro', to: '/packages/core/admin/' },
  {
    from: '/docs/core/admin/permissions/frontend/fetching-permissions',
    to: '/packages/core/admin/permissions/frontend/fetching-permissions',
  },
  {
    from: '/docs/core/admin/permissions/frontend/using-permissions',
    to: '/packages/core/admin/permissions/frontend/using-permissions',
  },
  {
    from: '/docs/core/admin/permissions/how-they-work',
    to: '/packages/core/admin/permissions/how-they-work',
  },
  { from: '/docs/core/authentication/sessions-and-jwt', to: '/architecture/authentication' },
  { from: '/docs/core/configuration/intro', to: '/packages/core/core/configuration/intro' },
  {
    from: '/docs/core/configuration/security-defaults',
    to: '/packages/core/core/configuration/security-defaults',
  },
  { from: '/docs/core/content-manager/blocks', to: '/packages/core/content-manager/blocks' },
  {
    from: '/docs/core/content-manager/content-releases',
    to: '/packages/core/content-manager/content-releases',
  },
  { from: '/docs/core/content-manager/documents', to: '/packages/core/content-manager/documents' },
  {
    from: '/docs/core/content-manager/features/review-workflows',
    to: '/packages/core/review-workflows/content-manager',
  },
  {
    from: '/docs/core/content-manager/hooks/use-content-types',
    to: '/packages/core/admin/hooks/use-content-types',
  },
  {
    from: '/docs/core/content-manager/hooks/use-document',
    to: '/packages/core/content-manager/hooks/use-document',
  },
  {
    from: '/docs/core/content-manager/hooks/use-document-actions',
    to: '/packages/core/content-manager/hooks/use-document-actions',
  },
  {
    from: '/docs/core/content-manager/hooks/use-drag-and-drop',
    to: '/packages/core/content-manager/hooks/use-drag-and-drop',
  },
  { from: '/docs/core/content-manager/intro', to: '/packages/core/content-manager/' },
  { from: '/docs/core/content-manager/layouts', to: '/packages/core/content-manager/layouts' },
  { from: '/docs/core/content-manager/preview', to: '/packages/core/content-manager/preview' },
  { from: '/docs/core/content-manager/RBAC', to: '/packages/core/content-manager/RBAC' },
  { from: '/docs/core/content-manager/relations', to: '/packages/core/content-manager/relations' },
  {
    from: '/docs/core/content-manager/services/permission-checker',
    to: '/packages/core/content-manager/services/permission-checker',
  },
  { from: '/docs/core/content-releases/backend', to: '/packages/core/content-releases/backend' },
  {
    from: '/docs/core/content-releases/frontend/intro',
    to: '/packages/core/content-releases/frontend/intro',
  },
  {
    from: '/docs/core/content-releases/frontend/release-details-page',
    to: '/packages/core/content-releases/frontend/release-details-page',
  },
  {
    from: '/docs/core/content-releases/frontend/releases-page',
    to: '/packages/core/content-releases/frontend/releases-page',
  },
  { from: '/docs/core/content-releases/intro', to: '/packages/core/content-releases/' },
  {
    from: '/docs/core/content-releases/scheduling',
    to: '/packages/core/content-releases/scheduling',
  },
  {
    from: '/docs/core/content-type-builder/content-structure',
    to: '/packages/core/content-type-builder/content-structure',
  },
  { from: '/docs/core/content-type-builder/intro', to: '/packages/core/content-type-builder/' },
  { from: '/docs/core/data-transfer/engine/', to: '/packages/core/data-transfer/engine/' },
  {
    from: '/docs/core/data-transfer/engine/stream-lifecycle',
    to: '/packages/core/data-transfer/engine/stream-lifecycle',
  },
  { from: '/docs/core/data-transfer/intro', to: '/packages/core/data-transfer/' },
  {
    from: '/docs/core/data-transfer/providers/destination-providers',
    to: '/packages/core/data-transfer/providers/destination-providers',
  },
  {
    from: '/docs/core/data-transfer/providers/local-strapi/destination',
    to: '/packages/core/data-transfer/providers/local-strapi/destination',
  },
  {
    from: '/docs/core/data-transfer/providers/local-strapi/overview',
    to: '/packages/core/data-transfer/providers/local-strapi/overview',
  },
  {
    from: '/docs/core/data-transfer/providers/local-strapi/source',
    to: '/packages/core/data-transfer/providers/local-strapi/source',
  },
  {
    from: '/docs/core/data-transfer/providers/overview',
    to: '/packages/core/data-transfer/providers/overview',
  },
  {
    from: '/docs/core/data-transfer/providers/remote-strapi/destination',
    to: '/packages/core/data-transfer/providers/remote-strapi/destination',
  },
  {
    from: '/docs/core/data-transfer/providers/remote-strapi/overview',
    to: '/packages/core/data-transfer/providers/remote-strapi/overview',
  },
  {
    from: '/docs/core/data-transfer/providers/remote-strapi/source',
    to: '/packages/core/data-transfer/providers/remote-strapi/source',
  },
  {
    from: '/docs/core/data-transfer/providers/remote-strapi/websocket',
    to: '/packages/core/data-transfer/providers/remote-strapi/websocket',
  },
  {
    from: '/docs/core/data-transfer/providers/source-providers',
    to: '/packages/core/data-transfer/providers/source-providers',
  },
  {
    from: '/docs/core/data-transfer/providers/strapi-file/destination',
    to: '/packages/core/data-transfer/providers/strapi-file/destination',
  },
  {
    from: '/docs/core/data-transfer/providers/strapi-file/file-structure',
    to: '/packages/core/data-transfer/providers/strapi-file/file-structure',
  },
  {
    from: '/docs/core/data-transfer/providers/strapi-file/overview',
    to: '/packages/core/data-transfer/providers/strapi-file/overview',
  },
  {
    from: '/docs/core/data-transfer/providers/strapi-file/source',
    to: '/packages/core/data-transfer/providers/strapi-file/source',
  },
  { from: '/docs/core/database/lifecycles', to: '/packages/core/database/lifecycles' },
  { from: '/docs/core/database/migrations', to: '/packages/core/database/migrations' },
  {
    from: '/docs/core/database/relations/polymorphic-relations',
    to: '/packages/core/database/relations/polymorphic-relations',
  },
  {
    from: '/docs/core/database/relations/reordering',
    to: '/packages/core/database/relations/reordering',
  },
  { from: '/docs/core/database/transactions', to: '/packages/core/database/transactions' },
  {
    from: '/docs/core/helper-plugin/hooks/use-persistent-state',
    to: '/packages/core/admin/hooks/use-persistent-state',
  },
  { from: '/docs/core/permissions/engine', to: '/packages/core/permissions/engine' },
  { from: '/docs/core/strapi/commands/build', to: '/packages/core/strapi/commands/build' },
  { from: '/docs/core/strapi/commands/develop', to: '/packages/core/strapi/commands/develop' },
  { from: '/docs/core/strapi/commands/overview', to: '/packages/core/strapi/commands/overview' },
  { from: '/docs/core/strapi/event-hub', to: '/packages/core/core/event-hub' },
  { from: '/docs/core/strapi/mcp-server', to: '/packages/core/core/mcp-server' },
  { from: '/docs/core/strapi/telemetry', to: '/packages/core/core/telemetry' },
  { from: '/docs/core/utils/async', to: '/packages/core/utils/async' },
  { from: '/docs/core/utils/traverse-entity', to: '/packages/core/utils/traverse-entity' },
  { from: '/docs/future-flags', to: '/architecture/future-flags' },
  { from: '/docs/intro', to: '/packages/' },
  { from: '/guides/code-of-conduct', to: '/contributing/code-of-conduct' },
  { from: '/guides/contributing', to: '/contributing/contributing-guide' },
  { from: '/guides/e2e/app-template', to: '/contributing/testing/e2e/app-template' },
  { from: '/guides/e2e/data-transfer', to: '/contributing/testing/e2e/data-transfer' },
  { from: '/guides/e2e/setup', to: '/contributing/testing/e2e/setup' },
  { from: '/guides/fe-coding-guidelines', to: '/contributing/frontend-guidelines' },
  { from: '/guides/type-system/', to: '/packages/core/types/type-system/' },
  { from: '/guides/type-system/cheatsheet', to: '/packages/core/types/type-system/cheatsheet' },
  { from: '/guides/type-system/concepts/', to: '/packages/core/types/type-system/concepts/' },
  {
    from: '/guides/type-system/concepts/public-registry',
    to: '/packages/core/types/type-system/concepts/public-registry',
  },
  {
    from: '/guides/type-system/concepts/schema',
    to: '/packages/core/types/type-system/concepts/schema',
  },
  { from: '/guides/type-system/concepts/uid', to: '/packages/core/types/type-system/concepts/uid' },
  { from: '/guides/type-system/philosophy', to: '/packages/core/types/type-system/philosophy' },
  { from: '/guides/typescript', to: '/contributing/typescript' },
  { from: '/guides/working-with-the-design-system', to: '/contributing/design-system' },
  { from: '/openapi', to: '/packages/core/openapi/' },
  { from: '/openapi/architecture', to: '/packages/core/openapi/architecture' },
  {
    from: '/openapi/contributing/assemblers',
    to: '/packages/core/openapi/contributing/assemblers',
  },
  {
    from: '/openapi/contributing/context-factory',
    to: '/packages/core/openapi/contributing/context-factory',
  },
  { from: '/openapi/contributing/overview', to: '/packages/core/openapi/contributing/overview' },
  {
    from: '/openapi/contributing/processors',
    to: '/packages/core/openapi/contributing/processors',
  },
  {
    from: '/openapi/contributing/routes-matcher-rule',
    to: '/packages/core/openapi/contributing/routes-matcher-rule',
  },
  {
    from: '/openapi/contributing/routes-provider',
    to: '/packages/core/openapi/contributing/routes-provider',
  },
  { from: '/openapi/contributing/testing', to: '/packages/core/openapi/contributing/testing' },
  { from: '/openapi/technologies', to: '/packages/core/openapi/technologies' },
  { from: '/openapi/usage', to: '/packages/core/openapi/usage' },
  { from: '/permissions', to: '/packages/core/permissions/' },
  { from: '/permissions-rbac', to: '/packages/core/admin/permissions/intro' },
  { from: '/rfcs', to: 'https://github.com/strapi/strapi/discussions/categories/rfcs' },
  {
    from: '/rfcs/custom-fields',
    to: 'https://github.com/strapi/strapi/discussions/categories/rfcs',
  },
  { from: '/rfcs/example', to: 'https://github.com/strapi/strapi/discussions/categories/rfcs' },
  { from: '/rfcs/intro', to: 'https://github.com/strapi/strapi/discussions/categories/rfcs' },
  {
    from: '/rfcs/publication-filter-query-modes',
    to: 'https://github.com/strapi/strapi/discussions/categories/rfcs',
  },
  { from: '/settings/intro', to: '/packages/core/admin/' },
  { from: '/settings/review-workflows', to: '/packages/core/review-workflows/settings' },
  { from: '/upload', to: '/packages/core/upload/' },
  { from: '/upload/mime-validation', to: '/packages/core/upload/backend/mime-validation' },
  { from: '/upload/providers', to: '/packages/core/upload/backend/providers' },
];
