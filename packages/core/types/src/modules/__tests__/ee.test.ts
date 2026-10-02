import type { EEService, Feature, FeatureName, FeatureOptions } from '../ee';

// What a plugin writes against `@strapi/strapi` or `@strapi/types`.
declare module '../..' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Public {
    export interface LicenseFeatures {
      'acme-feature': { seats?: number };
      // @ts-expect-error A plugin cannot change the options of a Strapi feature.
      sso: { seats: number };
    }
  }
}

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

true satisfies Assert<
  IsEqual<Extract<FeatureName, 'sso' | 'acme-feature'>, 'sso' | 'acme-feature'>
>;
true satisfies Assert<IsEqual<FeatureOptions['acme-feature'], { seats?: number }>>;
true satisfies Assert<
  IsEqual<
    Feature<'acme-feature'>,
    { name: 'acme-feature'; options?: { seats?: number }; [key: string]: any }
  >
>;

const checkFeatures = (features: EEService['features']) => {
  const auditLogs = features.get('audit-logs');
  const acme = features.get('acme-feature');

  true satisfies Assert<IsEqual<typeof auditLogs, Feature<'audit-logs'> | undefined>>;
  true satisfies Assert<IsEqual<typeof acme, Feature<'acme-feature'> | undefined>>;

  return [
    features.isEnabled('sso'),
    features.isEnabled('acme-feature'),
    auditLogs?.options?.retentionDays,
    acme?.options?.seats,
    // @ts-expect-error A typo of a declared name is not a feature name.
    features.isEnabled('acme-featur'),
    // @ts-expect-error A name no package declares is not a feature name.
    features.isEnabled('undeclared-feature'),
    // @ts-expect-error A typo of a Strapi feature is not a feature name.
    features.get('ssoo'),
    // @ts-expect-error Options keep the shape their feature declares.
    acme?.options?.retentionDays,
  ];
};

declare const ee: EEService;

checkFeatures(ee.features);
