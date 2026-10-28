import type { Core, Schema, UID } from '@strapi/strapi';
import type { EEUsersService, SeatsService } from './licensed-provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type HasUndefined<T> = undefined extends T ? true : false;

/** The licensed attributes of `licensed-schemas.d.ts` a content type has. */
type LicensedAttributeNames<TUID extends UID.ContentType> = Extract<
  keyof Schema.ContentType<TUID>['attributes'],
  'strapi_stage' | 'strapi_assignee' | 'licensed_note'
>;

declare const app: Core.Strapi;

// Type generation with `licensedFeatures: ['licensed']`, for a license with no feature: the EE
// edition is merged, and the contracts of every feature are missing.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'on'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'off'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, SeatsService>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, undefined>>,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::licensed-provider.users'>['isSSOLocked'],
      EEUsersService['isSSOLocked']
    >
  >,
  // Only the attribute gated by `licensed` is added.
  Core.Assert<Equal<LicensedAttributeNames<'api::article.article'>, 'licensed_note'>>,
];
checks satisfies unknown;

void app.service('plugin::licensed-provider.seats').getDisabledUserList();

// The admin EE edition is merged, so EE-only services exist, and CE services have the members it adds.
declare const adminChecks: [
  Core.Assert<Equal<HasUndefined<Core.ServiceFor<'admin::persist-tables'>>, false>>,
  Core.Assert<Equal<HasUndefined<Core.ServiceFor<'admin::seat-enforcement'>>, false>>,
  Core.Assert<Equal<HasUndefined<Core.ServiceFor<'admin::metrics'>['getSSOProvidersList']>, false>>,
  Core.Assert<
    Equal<HasUndefined<Core.ServiceFor<'admin::role'>['ssoCheckRolesIdForDeletion']>, false>
  >,
  Core.Assert<
    Equal<HasUndefined<Core.ServiceFor<'admin::user'>['getCurrentActiveUserCount']>, false>
  >,
];
adminChecks satisfies unknown;

void app.service('admin::seat-enforcement').getDisabledUserList();
void app.service('admin::role').ssoCheckRolesIdForDeletion([]);

// The admin EE edition is merged, so CE controllers have the actions it adds. `audit-logs` is not
// listed, so the audit logs controller is missing.
declare const adminControllerChecks: [
  Core.Assert<Equal<Core.ControllerFor<'admin::audit-logs'>, undefined>>,
  Core.Assert<
    Equal<HasUndefined<Core.ControllerFor<'admin::admin'>['licenseLimitInformation']>, false>
  >,
  Core.Assert<
    Equal<HasUndefined<Core.ControllerFor<'admin::authentication'>['getProviders']>, false>
  >,
  Core.Assert<Equal<HasUndefined<Core.ControllerFor<'admin::user'>['isSSOLocked']>, false>>,
];
adminControllerChecks satisfies unknown;

void app.controller('admin::user').isSSOLocked.call;
// @ts-expect-error The feature is not listed: the contract is `undefined`.
void app.controller('admin::audit-logs').findMany;
