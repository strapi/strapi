import type { Core, Schema, UID } from '@strapi/strapi';
import type { SeatsService } from './licensed-provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type HasUndefined<T> = undefined extends T ? true : false;

/** The licensed attributes of `licensed-schemas.d.ts` a content type has. */
type LicensedAttributeNames<TUID extends UID.ContentType> = Extract<
  keyof Schema.ContentType<TUID>['attributes'],
  'strapi_stage' | 'strapi_assignee' | 'licensed_note'
>;

declare const app: Core.Strapi;

// Type generation with `licensedFeatures: ['audit-logs']`: the audit logs contracts exist, those of
// other features are missing. A listed feature implies `'licensed'`, so the EE edition is merged.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.LicenseState<'audit-logs'>, 'on'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'off'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'on'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, SeatsService>>,
  // Only the attribute gated by `licensed` is added.
  Core.Assert<Equal<LicensedAttributeNames<'api::article.article'>, 'licensed_note'>>,
];
checks satisfies unknown;

// The audit logs controller exists, and CE controllers have the actions the EE edition adds.
declare const adminControllerChecks: [
  Core.Assert<Equal<HasUndefined<Core.ControllerFor<'admin::audit-logs'>>, false>>,
  Core.Assert<
    Equal<
      keyof Core.ControllerFor<'admin::audit-logs'>,
      'findMany' | 'findManyUsers' | 'findOne' | 'export'
    >
  >,
  Core.Assert<
    Equal<HasUndefined<Core.ControllerFor<'admin::admin'>['licenseLimitInformation']>, false>
  >,
  Core.Assert<
    Equal<HasUndefined<Core.ControllerFor<'admin::authentication'>['getProviders']>, false>
  >,
  Core.Assert<Equal<HasUndefined<Core.ControllerFor<'admin::user'>['isSSOLocked']>, false>>,
];
adminControllerChecks satisfies unknown;

void app.controller('admin::audit-logs').findMany.call;
// @ts-expect-error The feature is not listed: the contract is `undefined`.
void app.service('plugin::licensed-provider.reports').count();
