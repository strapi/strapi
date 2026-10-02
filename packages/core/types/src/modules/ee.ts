import type { Strapi } from '../core';
import type * as Public from '../public';

/**
 * Options of each license feature, keyed by feature name.
 *
 * Augment {@link Public.LicenseFeatures} to declare a feature, not this type.
 */
export type FeatureOptions = Public.LicenseFeatures;

export type FeatureName = keyof FeatureOptions;

/**
 * A license feature as `features.get` returns it: `options` and any other key are the ones the
 * license lists.
 */
export type Feature<TName extends FeatureName = FeatureName> = TName extends FeatureName
  ? { name: TName; options?: FeatureOptions[TName]; [key: string]: any }
  : never;

export type LicenseType = 'bronze' | 'silver' | 'gold';

export type EEService = {
  seats: number | null | undefined;
  type: string | null | undefined;
  isEE: boolean;
  isTrial: boolean;
  subscriptionId?: string | null | undefined;
  planPriceId?: string | null | undefined;
  getTrialEndDate: ({ strapi }: { strapi: Strapi }) => Promise<{ trialEndsAt: string } | null>;
  features: {
    isEnabled: (name: FeatureName) => boolean;
    /** `seat-limit` comes from `seats`, see {@link Public.LicenseFeatures}. */
    get: <TName extends FeatureName>(name: TName) => Feature<TName> | undefined;
    /**
     * Every feature the license lists, including names this version of Strapi does not know.
     * Without `seat-limit`, which only `get` and `isEnabled` derive from `seats`.
     */
    list: () => { name: string; [key: string]: any }[];
  };
};
