import type * as Core from '..';

type ReportsService = { count(): number };
type CEUsersService = { create(): string; list(): string[] };
type EEUsersService = { create(): number; isSSOLocked(): boolean };

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

type Users = Core.LicensedExtension<CEUsersService, EEUsersService>;

// This program, like every package program, declares no license scope: a gated contract may be
// missing, and EE-only members are optional. Registering gated entries here would change every
// registry test of this program: the declared scopes are checked by the consumer tests.
declare const checks: [
  Core.Assert<
    Equal<
      Core.LicenseFeatureName,
      | 'sso'
      | 'audit-logs'
      | 'review-workflows'
      | 'cms-content-releases'
      | 'cms-content-history'
      | 'cms-advanced-preview'
      | 'cms-ai'
      | 'cms-byok-ai'
    >
  >,
  Core.Assert<Equal<Core.LicenseGate, Core.LicenseFeatureName | 'licensed'>>,
  Core.Assert<Equal<Core.LicenseScope, 'unknown'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'unknown'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'unknown'>>,
  Core.Assert<Equal<Core.Licensed<'review-workflows', ReportsService>, ReportsService | undefined>>,
  Core.Assert<Equal<Core.Licensed<'licensed', ReportsService>, ReportsService | undefined>>,
  // CE members keep their CE type; EE-only members are optional.
  Core.Assert<Equal<Users['create'], () => string>>,
  Core.Assert<Equal<Users['isSSOLocked'], (() => boolean) | undefined>>,
  Core.Assert<Equal<Users['list'], () => string[]>>,
  Core.Assert<
    Equal<NonNullable<Core.Config.TypeScript['licensedFeatures']>, Array<Core.LicenseGate>>
  >,
];
checks satisfies unknown;

// @ts-expect-error A gate names a feature of the license inventory.
export type MisspelledGate = Core.Licensed<'review-workflow', ReportsService>;

export const config: Core.Config.TypeScript = {
  strictTypes: true,
  licensedFeatures: ['review-workflows', 'licensed'],
};

export const misspelled: Core.Config.TypeScript = {
  // @ts-expect-error An application lists features of the license inventory.
  licensedFeatures: ['reveiw-workflows'],
};

// License feature reads take a feature of the inventory, or a name known only at runtime.
declare const strapi: Core.Strapi;
declare const runtimeName: string;
const workflows = strapi.ee.features.get('review-workflows');
const runtimeFeature = strapi.ee.features.get(runtimeName);
declare const featureChecks: [
  Core.Assert<Equal<typeof workflows, Core.LicenseFeatureEntry<'review-workflows'> | undefined>>,
  Core.Assert<
    Equal<
      NonNullable<typeof workflows>['options'],
      Strapi.Registries.LicenseFeatures['review-workflows'] | undefined
    >
  >,
  Core.Assert<Equal<NonNullable<typeof workflows>['name'], 'review-workflows'>>,
  Core.Assert<Equal<NonNullable<typeof runtimeFeature>['name'], string>>,
  Core.Assert<
    Equal<NonNullable<typeof runtimeFeature>['options'], Record<string, unknown> | undefined>
  >,
  Core.Assert<Equal<Core.LicenseFeatureLookup<'reveiw-workflows'>, Core.LicenseFeatureName>>,
];
featureChecks satisfies unknown;

strapi.ee.features.isEnabled('sso') satisfies boolean;
strapi.ee.features.isEnabled(runtimeName) satisfies boolean;
// @ts-expect-error A literal feature name is a feature of the inventory.
strapi.ee.features.isEnabled('ssso');
// @ts-expect-error A literal feature name is a feature of the inventory.
strapi.ee.features.get('cms-content-release');
