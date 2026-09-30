import type { Strapi } from '../core';
import type * as Public from '../public';

/**
 * Options of each license feature, keyed by feature name.
 *
 * Augment {@link Public.LicenseFeatures} to declare a feature, not this type.
 */
export type FeatureOptions = Public.LicenseFeatures;

export type FeatureName = keyof FeatureOptions;

export type Feature<TName extends FeatureName = FeatureName> = TName extends FeatureName
  ? { name: TName; options: FeatureOptions[TName] }
  : never;

export type LicenseType = 'bronze' | 'silver' | 'gold';

/** Plan label for display. Never a gate. */
export type Edition = 'Community' | 'Growth' | 'Enterprise';

export type EEService = {
  /** @deprecated Use `features.get('seat-limit')`. */
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
