import type { Core, Schema, UID } from '@strapi/strapi';
import type {
  CEUsersService,
  EEUsersService,
  ReleasesService,
  ReportsController,
  ReportsService,
  SeatsService,
} from './licensed-provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type HasUndefined<T> = undefined extends T ? true : false;

/** The licensed attributes of `licensed-schemas.d.ts` a content type has. */
type LicensedAttributeNames<TUID extends UID.ContentType> = Extract<
  keyof Schema.ContentType<TUID>['attributes'],
  'strapi_stage' | 'strapi_assignee' | 'licensed_note'
>;

declare const app: Core.Strapi;

// No license scope: a plugin program, or an application that opts in to strict types without type
// generation. Gated contracts may be missing, and EE-only members are optional.
declare const checks: [
  Core.Assert<Equal<Core.IsStrict, true>>,
  Core.Assert<Equal<Core.LicenseScope, 'unknown'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'unknown'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'unknown'>>,
  Core.Assert<
    Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, ReportsService | undefined>
  >,
  Core.Assert<
    Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, ReleasesService | undefined>
  >,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, SeatsService | undefined>>,
  Core.Assert<
    Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, ReportsController | undefined>
  >,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::licensed-provider.users'>,
      CEUsersService & Partial<Omit<EEUsersService, keyof CEUsersService>>
    >
  >,
  // Licensed attributes are missing: the schemas are those type generation writes.
  Core.Assert<Equal<LicensedAttributeNames<'api::article.article'>, never>>,
];
checks satisfies unknown;

app.plugin('licensed-provider').service('reports')?.count() satisfies number | undefined;
// @ts-expect-error The service may be missing.
app.service('plugin::licensed-provider.reports').count();
app.service('plugin::licensed-provider.users').isSSOLocked?.() satisfies boolean | undefined;

// The admin EE edition: EE-only services may be missing, and the members it adds to CE services
// are optional.
declare const adminChecks: [
  Core.Assert<HasUndefined<Core.ServiceFor<'admin::persist-tables'>>>,
  Core.Assert<HasUndefined<Core.ServiceFor<'admin::seat-enforcement'>>>,
  Core.Assert<HasUndefined<Core.ServiceFor<'admin::metrics'>['getSSOProvidersList']>>,
  Core.Assert<HasUndefined<Core.ServiceFor<'admin::role'>['ssoCheckRolesIdForDeletion']>>,
  Core.Assert<HasUndefined<Core.ServiceFor<'admin::user'>['getCurrentActiveUserCount']>>,
];
adminChecks satisfies unknown;

// @ts-expect-error The service may be missing.
void app.service('admin::seat-enforcement').getDisabledUserList();
void app.service('admin::role').ssoCheckRolesIdForDeletion?.([]);

// License feature reads, in any license scope: a literal name is a feature of the inventory, and
// `get` types the options of its entry.
declare const runtimeName: string;
const releases = app.ee.features.get('cms-content-releases');
declare const featureChecks: [
  Core.Assert<
    Equal<
      NonNullable<typeof releases>['options'],
      Strapi.Registries.LicenseFeatures['cms-content-releases'] | undefined
    >
  >,
  Core.Assert<Equal<NonNullable<typeof releases>['name'], 'cms-content-releases'>>,
];
featureChecks satisfies unknown;
app.ee.features.isEnabled(runtimeName) satisfies boolean;
// @ts-expect-error A literal feature name is a feature of the inventory.
app.ee.features.isEnabled('cms-content-release');
app.ee.entitlements.register({
  // @ts-expect-error A literal feature name is a feature of the inventory.
  feature: 'cms-content-release',
  limits: [],
});

// The admin EE controllers: the audit logs controller may be missing, and the actions the EE edition
// adds to CE controllers are optional. The actions it replaces keep their CE contract.
declare const adminControllerChecks: [
  Core.Assert<HasUndefined<Core.ControllerFor<'admin::audit-logs'>>>,
  Core.Assert<HasUndefined<Core.ControllerFor<'admin::admin'>['licenseLimitInformation']>>,
  Core.Assert<HasUndefined<Core.ControllerFor<'admin::authentication'>['getProviders']>>,
  Core.Assert<HasUndefined<Core.ControllerFor<'admin::user'>['isSSOLocked']>>,
  Core.Assert<Equal<HasUndefined<Core.ControllerFor<'admin::role'>['create']>, false>>,
];
adminControllerChecks satisfies unknown;

// @ts-expect-error The controller may be missing.
void app.controller('admin::audit-logs').findMany;
void app.controller('admin::user').isSSOLocked?.call;
