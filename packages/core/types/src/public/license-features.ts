/**
 * Options of each license feature, keyed by feature name.
 *
 * Strapi declares its own features here. A plugin or an app augments it to check its own
 * features: `strapi.ee.features.isEnabled` then accepts the name, `get` types its options, and
 * undeclared names still fail to compile. Declaring a feature only types it; the license
 * enables it. The augmenting file must import the module it augments.
 *
 * @example
 * ```ts
 * import type {} from '@strapi/strapi';
 *
 * declare module '@strapi/strapi' {
 *   export namespace Public {
 *     export interface LicenseFeatures {
 *       'acme-feature': { seats?: number };
 *     }
 *   }
 * }
 * ```
 */
export interface LicenseFeatures {
  /** `@strapi/admin` EE: SSO routes, passport strategies, provider actions, SSO lock and login. */
  sso: Record<string, unknown>;
  /** `@strapi/admin` EE: audit-log services, lifecycle, routes, actions and settings page. */
  'audit-logs': { retentionDays?: number | null };
  /** `@strapi/review-workflows`: the whole plugin (else content types only) and its webhook events. */
  'review-workflows': { numberOfWorkflows?: number; stagesPerWorkflow?: number };
  /** `@strapi/content-releases`: the whole plugin (else content types only) and its webhook events. */
  'cms-content-releases': { maximumReleases?: number };
  /** `@strapi/content-manager`: the content history module and its purge cron. */
  'cms-content-history': { retentionDays?: number };
  /** `@strapi/content-manager` admin: the preview side editor. */
  'cms-advanced-preview': Record<string, unknown>;
  /** `@strapi/admin` AI service: Strapi-managed AI. */
  'cms-ai': Record<string, unknown>;
  /** `@strapi/admin` AI service: custom AI providers (bring your own key). */
  'cms-byok-ai': Record<string, unknown>;
  /**
   * `@strapi/admin` EE: seat enforcement and the seat check on user creation and activation.
   * `features.get` and `features.isEnabled` derive it from the license's top-level `seats`, present
   * when `seats` is neither `undefined` nor `null`; `features.list()` does not include it.
   */
  'seat-limit': { seats: number };
}
