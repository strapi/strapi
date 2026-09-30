import type { Strapi } from '../core';

/**
 * Options of each license feature, keyed by feature name.
 *
 * An interface so other packages can augment it with their own features.
 */
export interface FeatureOptions {
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
}

export type FeatureName = keyof FeatureOptions;

export type Feature<TName extends FeatureName = FeatureName> = TName extends FeatureName
  ? { name: TName; options: FeatureOptions[TName] }
  : never;

export type LicenseType = 'bronze' | 'silver' | 'gold';

/** Plan label for display. Never a gate. */
export type Edition = 'Community' | 'Growth' | 'Enterprise';

export type EEService = {
  seats: number | null | undefined;
  type: string | null | undefined;
  isEE: boolean;
  isTrial: boolean;
  subscriptionId?: string | null | undefined;
  planPriceId?: string | null | undefined;
  /**
   * The license this project provides, read once at startup: `STRAPI_LICENSE`, else `license.txt`.
   * The license registry does not refresh it. `undefined` when `STRAPI_DISABLE_EE=true` or no
   * license is found. Only for forwarding to Strapi services: gate on a feature, never on this.
   *
   * @internal
   */
  providedLicense: string | undefined;
  /** `Community` without an enabled license, `Growth` for a growth plan, else `Enterprise`. */
  edition: Edition;
  getTrialEndDate: ({ strapi }: { strapi: Strapi }) => Promise<{ trialEndsAt: string } | null>;
  features: {
    isEnabled: (name: FeatureName) => boolean;
    get: <TName extends FeatureName>(name: TName) => Feature<TName> | undefined;
    /** Every license feature, including names this version of Strapi does not know. */
    list: () => Array<{ name: string; options: Record<string, unknown> }>;
  };
};
