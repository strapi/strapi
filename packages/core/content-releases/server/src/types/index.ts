import type { Core, Data, Modules, Struct } from '@strapi/types';
import type { queryParams } from '@strapi/utils';
import type { Controllers } from './controllers';
import type createHomepageService from '../services/homepage';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';
import type { Pagination, Release } from '../../../shared/contracts/releases';
import type { ReleaseService } from '../services/release';
import type { FindPageQuery, ReleaseActionService } from '../services/release-action';
import type createSchedulingService from '../services/scheduling';
import type { SettingsService } from '../services/settings';
import type createReleaseValidationService from '../services/validation';

export type * from './controllers';

type ReleaseValidationImplementation = ReturnType<typeof createReleaseValidationService>;

/**
 * The `release-validation` service. Updates may omit `scheduledAt`, which the check accepts at
 * runtime; the implementation keeps its published develop parameter type.
 */
type ReleaseValidationService = Omit<
  ReleaseValidationImplementation,
  'validateScheduledAtIsLaterThanNow'
> & {
  validateScheduledAtIsLaterThanNow(
    scheduledAt:
      | Parameters<ReleaseValidationImplementation['validateScheduledAtIsLaterThanNow']>[0]
      | undefined
  ): ReturnType<ReleaseValidationImplementation['validateScheduledAtIsLaterThanNow']>;
};

/**
 * A release action as the query engine returns it: its columns, without the relations
 * (`tests/api/core/content-releases/content-releases-service-results.test.api.ts`). `locale` is
 * `null` for a content type without i18n.
 */
type ReleaseActionRow = Omit<ReleaseAction, 'entry' | 'locale' | 'release' | 'status'> & {
  locale: string | null;
};

/** A written release action, with the ID of its release. */
type CreatedReleaseAction = ReleaseActionRow & { release: Pick<Release, 'id'> };

type ReleaseActionFilters =
  Modules.Documents.Params.Filters.Any<'plugin::content-releases.release-action'>;

/**
 * Filters of `countActions`: the Document Service filters, or the same with the `release` relation
 * given by its ID, as `controllers/release.ts` (`findOne`) and `services/release.ts`
 * (`updateReleaseStatus`) pass it. The query engine reads a scalar relation filter as its ID
 * (`tests/api/core/content-releases/content-releases-service-results.test.api.ts`).
 */
type CountActionsFilters =
  ReleaseActionFilters | (Omit<ReleaseActionFilters, 'release'> & { release: Release['id'] });

type ReleaseActionServiceOverride =
  | 'groupActions'
  | 'getContentTypeModelsFromActions'
  | 'create'
  | 'createMany'
  | 'findPage'
  | 'countActions'
  | 'update'
  | 'delete';

/**
 * The `release-action` service. The controller groups a page by its query's `sort`, so the `action`
 * grouping arrives as `type`; the implementation keeps its published develop parameter type.
 * The query engine's results stay `any` in the implementation; the results below are the ones the
 * runtime returns.
 */
type ReleaseActionServiceContract = Omit<ReleaseActionService, ReleaseActionServiceOverride> & {
  groupActions(
    actions: Parameters<ReleaseActionService['groupActions']>[0],
    groupBy?: Parameters<ReleaseActionService['groupActions']>[1] | FindPageQuery['sort']
  ): ReturnType<ReleaseActionService['groupActions']>;
  /** Reads only the content type of each action, so it takes the rows of a page. */
  getContentTypeModelsFromActions(
    actions: Array<Pick<ReleaseAction, 'contentType'>>
  ): ReturnType<ReleaseActionService['getContentTypeModelsFromActions']>;
  create(...args: Parameters<ReleaseActionService['create']>): Promise<CreatedReleaseAction>;
  /** `alreadyInRelease` counts the entries already in the release or listed twice. */
  createMany(
    ...args: Parameters<ReleaseActionService['createMany']>
  ): Promise<{ created: CreatedReleaseAction[]; alreadyInRelease: number }>;
  /**
   * `entry` is the deep-populated document (the draft for a publish action); `entry` and `status`
   * are `null` when the content type or the entry no longer exists.
   */
  findPage(...args: Parameters<ReleaseActionService['findPage']>): Promise<{
    results: Array<ReleaseActionRow & Pick<ReleaseAction, 'entry' | 'status'>>;
    pagination: Pagination;
  }>;
  countActions(query: {
    filters?: CountActionsFilters;
  }): ReturnType<ReleaseActionService['countActions']>;
  update(...args: Parameters<ReleaseActionService['update']>): Promise<ReleaseActionRow>;
  /** The deleted action, without its release. */
  delete(...args: Parameters<ReleaseActionService['delete']>): Promise<ReleaseActionRow>;
};

/**
 * A release as the query engine returns it: its columns, without the relations
 * (`tests/api/core/content-releases/content-releases-service-results.test.api.ts`).
 */
type ReleaseRow = Omit<Release, 'actions'>;

/** The populate of a release read. */
type ReleasePopulate = queryParams.Params['populate'];

/** The relations of a release. */
type ReleaseRelation = 'actions' | 'createdBy' | 'updatedBy';

/** Each relation populated with a value the types cannot read, such as a variable's. */
type UnreadPopulate = { [TRelation in ReleaseRelation]: ReleasePopulate };

/**
 * The relations that a release read with `TPopulate` populates, each with its populate value
 * (`true` when the populate names it). A relation set to `false` is not populated.
 */
type PopulateByRelation<TPopulate> = 0 extends 1 & TPopulate
  ? UnreadPopulate
  : [TPopulate] extends [string]
    ? string extends TPopulate
      ? UnreadPopulate
      : [TPopulate] extends ['*']
        ? UnreadPopulate
        : { [TRelation in Extract<TPopulate, ReleaseRelation>]: true }
    : [TPopulate] extends [readonly (infer TName)[]]
      ? string extends TName
        ? UnreadPopulate
        : '*' extends TName
          ? UnreadPopulate
          : { [TRelation in Extract<TName, ReleaseRelation>]: true }
      : [TPopulate] extends [object]
        ? string extends keyof TPopulate
          ? UnreadPopulate
          : {
              [
                TRelation in Extract<
                  keyof TPopulate,
                  ReleaseRelation
                > as TPopulate[TRelation] extends false ? never : TRelation
              ]: TPopulate[TRelation];
            }
        : UnreadPopulate;

/**
 * The admin user's row without its relations, as a populated `createdBy` holds it: with strict
 * types, the `admin::user` row of the schema the admin declares, every column possibly `null`
 * (`Modules.Documents.StrictResult`, as the registered `admin::user` contract reads it). Without
 * strict types, the registered contract's `findOne` result without its roles. The published
 * contracts do not import `@strapi/admin`, which is not a dependency of this package.
 */
type AdminUserRow = Core.IsStrict extends true
  ? Modules.Documents.StrictResult<'admin::user', Record<never, never>, 'published'>
  : Omit<NonNullable<Awaited<ReturnType<Core.ServiceFor<'admin::user'>['findOne']>>>, 'roles'>;

/**
 * A populated relation as the plugin's `findMany` and `findOne` callers read it (same API test): the
 * full `actions` when the populate names them, and the `actions` with only the requested `fields`
 * (plus `id` and `documentId`), filtered or not. A named `createdBy` is the admin user's row without
 * its roles, and `null` once the user is deleted (the join column is set to `null`). Any other
 * populate gives `unknown`.
 */
type PopulatedRelation<TRelation, TValue> = TRelation extends 'actions'
  ? [TValue] extends [true]
    ? ReleaseActionRow[]
    : [TValue] extends [{ fields: readonly (infer TField)[] }]
      ? string extends TField
        ? unknown
        : [Exclude<keyof TValue, 'fields' | 'filters'>] extends [never]
          ? Array<
              Pick<ReleaseActionRow, 'id' | 'documentId' | Extract<TField, keyof ReleaseActionRow>>
            >
          : unknown
      : unknown
  : TRelation extends 'createdBy'
    ? [TValue] extends [true]
      ? AdminUserRow | null
      : unknown
    : unknown;

/**
 * A release row with the relations that `TPopulate` populates. A populate that may be `undefined`
 * populates what its defined part names.
 */
type PopulatedRelease<TPopulate> = [TPopulate] extends [undefined]
  ? ReleaseRow
  : ReleaseRow & {
      [TRelation in keyof PopulateByRelation<Exclude<TPopulate, undefined>>]: PopulatedRelation<
        TRelation,
        PopulateByRelation<Exclude<TPopulate, undefined>>[TRelation]
      >;
    };

/**
 * A query-engine filter on releases, passed as is. The controllers filter with `null` values and
 * with query-string values, which the Document Service filters reject.
 */
type ReleaseWhere = Record<string, unknown>;

/**
 * The user a release write records as its creator or editor: the service reads its `id` only
 * (`setCreatorFields` in `services/release.ts`), so a user read from the `admin::user` service or
 * `ctx.state.user` is accepted.
 */
type ReleaseWriter = { user: { id: Data.ID } };

/**
 * The `release` service. The query engine's result stays `any` in the implementation, and the
 * published declaration prints the content-manager components as `any`; the results below are the
 * ones the runtime returns. `findOne` and `findMany` follow the caller's `populate`.
 */
type ReleaseServiceContract = Omit<
  ReleaseService,
  | 'create'
  | 'createFromSkippedEntries'
  | 'findOne'
  | 'findPage'
  | 'findMany'
  | 'update'
  | 'getAllComponents'
> & {
  create(
    releaseData: Parameters<ReleaseService['create']>[0],
    creator: ReleaseWriter
  ): ReturnType<ReleaseService['create']>;
  createFromSkippedEntries(
    releaseId: Parameters<ReleaseService['createFromSkippedEntries']>[0],
    releaseData: Parameters<ReleaseService['createFromSkippedEntries']>[1],
    creator: ReleaseWriter
  ): ReturnType<ReleaseService['createFromSkippedEntries']>;
  /** The release with the relations that `populate` names, or `null` when no release matches. */
  findOne<const TPopulate extends ReleasePopulate | undefined = undefined>(
    id: Parameters<ReleaseService['findOne']>[0],
    query?: { populate?: TPopulate }
  ): Promise<PopulatedRelease<TPopulate> | null>;
  /** A page of releases, each with the count of its actions, whatever the query. */
  findPage(...args: Parameters<ReleaseService['findPage']>): Promise<{
    results: Array<ReleaseRow & { actions: { count: number } }>;
    pagination: Pagination;
  }>;
  /** The releases that match `where`, with the relations that `populate` names. */
  findMany<const TPopulate extends ReleasePopulate | undefined = undefined>(query?: {
    where?: ReleaseWhere;
    populate?: TPopulate;
  }): Promise<PopulatedRelease<TPopulate>[]>;
  update(
    id: Parameters<ReleaseService['update']>[0],
    releaseData: Parameters<ReleaseService['update']>[1],
    creator: ReleaseWriter
  ): Promise<ReleaseRow>;
  /** The component schemas by UID. */
  getAllComponents(): Promise<Record<Struct.ComponentSchema['uid'], Struct.ComponentSchema>>;
};

/** Content Releases services by name, as registered by the plugin. */
export type Services = {
  homepage: ReturnType<typeof createHomepageService>;
  release: ReleaseServiceContract;
  'release-action': ReleaseActionServiceContract;
  'release-validation': ReleaseValidationService;
  scheduling: ReturnType<typeof createSchedulingService>;
  settings: SettingsService;
};

/**
 * Default contracts loaded with the Content Releases server types.
 * The services and controllers are only registered when the `cms-content-releases` EE feature is
 * enabled.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * The outcome of a release publish, emitted by the release service and forwarded to webhooks.
       * `isPublished` tells the two payloads apart: the published release, or the error that stopped
       * the publish. Emitted whatever the license, like the store row.
       */
      interface Events {
        'releases.publish': [
          | { isPublished: true; error: undefined; release: Release }
          | { isPublished: false; error: unknown; release: undefined },
        ];
      }

      /**
       * The releases settings, written by the settings service under the `core` type. A
       * `defaultTimezone` left `undefined` is dropped by the JSON encoding, so the key may be
       * missing. Stored whatever the license, so it is not `undefined` like the services.
       */
      interface Stores {
        'core_content-releases_settings': { defaultTimezone?: string | null | undefined };
      }

      // Registered only when the `cms-content-releases` EE feature is enabled: `undefined` unless
      // the application lists the feature in `licensedFeatures`, `T | undefined` in package and
      // plugin programs.
      interface PackageServices {
        'plugin::content-releases.homepage': Core.Licensed<
          'cms-content-releases',
          Services['homepage']
        >;
        'plugin::content-releases.release': Core.Licensed<
          'cms-content-releases',
          Services['release']
        >;
        'plugin::content-releases.release-action': Core.Licensed<
          'cms-content-releases',
          Services['release-action']
        >;
        'plugin::content-releases.release-validation': Core.Licensed<
          'cms-content-releases',
          Services['release-validation']
        >;
        'plugin::content-releases.scheduling': Core.Licensed<
          'cms-content-releases',
          Services['scheduling']
        >;
        'plugin::content-releases.settings': Core.Licensed<
          'cms-content-releases',
          Services['settings']
        >;
      }

      // Registered with the services (`index.ts`), under the same feature.
      interface PackageControllers {
        'plugin::content-releases.homepage': Core.Licensed<
          'cms-content-releases',
          Controllers['homepage']
        >;
        'plugin::content-releases.release': Core.Licensed<
          'cms-content-releases',
          Controllers['release']
        >;
        'plugin::content-releases.release-action': Core.Licensed<
          'cms-content-releases',
          Controllers['release-action']
        >;
        'plugin::content-releases.settings': Core.Licensed<
          'cms-content-releases',
          Controllers['settings']
        >;
      }

      /**
       * Registered in `register` (`constants.ts`), only when the `cms-content-releases` EE feature
       * is enabled: without it, these IDs are absent at runtime.
       */
      interface PermissionActions {
        'plugin::content-releases.read': true;
        'plugin::content-releases.create': true;
        'plugin::content-releases.update': true;
        'plugin::content-releases.delete': true;
        'plugin::content-releases.publish': true;
        'plugin::content-releases.delete-action': true;
        'plugin::content-releases.create-action': true;
        'plugin::content-releases.settings.read': true;
        'plugin::content-releases.settings.update': true;
      }
    }
  }
}
