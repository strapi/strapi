import type { Core, Schema, UID } from '@strapi/strapi';
import type {
  CEUsersService,
  EEUsersService,
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

// Type generation with `licensedFeatures: ['review-workflows']`: the contracts of the listed feature
// exist, those of other features are missing. A listed feature implies `'licensed'`, so the EE
// edition is merged.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'on'>>,
  Core.Assert<Equal<Core.LicenseState<'cms-content-releases'>, 'off'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'on'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, ReportsService>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, SeatsService>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, ReportsController>>,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::licensed-provider.users'>,
      Omit<CEUsersService, keyof EEUsersService> & EEUsersService
    >
  >,
  // Review workflows adds its stage and assignee to the content types it extends, and the provider
  // (`licensed`) adds its attribute to every content type, package ones included.
  Core.Assert<
    Equal<
      LicensedAttributeNames<'api::article.article'>,
      'strapi_stage' | 'strapi_assignee' | 'licensed_note'
    >
  >,
  Core.Assert<Equal<LicensedAttributeNames<'api::hidden.hidden'>, 'licensed_note'>>,
  Core.Assert<Equal<LicensedAttributeNames<'api::note.note'>, 'licensed_note'>>,
  Core.Assert<Equal<LicensedAttributeNames<'plugin::review-workflows.workflow'>, 'licensed_note'>>,
  Core.Assert<
    Equal<
      Schema.ContentType<'api::article.article'>['attributes']['strapi_stage'],
      Schema.Attribute.Relation<'oneToOne', 'plugin::review-workflows.workflow-stage'>
    >
  >,
  Core.Assert<Equal<'api::article.article' extends UID.CollectionType ? true : false, true>>,
];
checks satisfies unknown;

app.plugin('licensed-provider').service('reports').count() satisfies number;
void app
  .service('plugin::licensed-provider.users')
  .create()
  .then((user) => user.isSSOLocked satisfies boolean);
// @ts-expect-error The feature is not listed: the contract is `undefined`.
void app.service('plugin::licensed-provider.releases').publish(1);

// The listed feature implies the admin EE edition, so EE-only services exist, and CE services have the members it adds.
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

const articles = app.documents('api::article.article');
articles.findFirst({
  populate: { strapi_stage: true, strapi_assignee: true },
}) satisfies Promise<unknown>;
const hiddens = app.documents('api::hidden.hidden');
// @ts-expect-error Review workflows does not extend content types hidden from the content manager.
hiddens.findFirst({ populate: { strapi_stage: true } }) satisfies Promise<unknown>;
