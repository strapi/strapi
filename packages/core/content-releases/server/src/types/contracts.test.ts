// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Modules, Struct } from '@strapi/types';
import type { SanitizedAdminUser } from '@strapi/admin/strapi-admin';
import type { AdminUser } from '@strapi/admin/strapi-server';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';
import type { Pagination, Release, ReleaseDataResponse } from '../../../shared/contracts/releases';
import type { Services } from './index';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// The shared contracts name the admin user that the admin panel exports, without loading the panel.
declare const checks: [Expect<Equal<ReleaseDataResponse['createdBy'], SanitizedAdminUser>>];
checks satisfies unknown;

/**
 * A populated `createdBy`: the `admin::user` row without its relations
 * (`content-releases-service-results.test.api.ts`), every column possibly `null`.
 */
type AdminUserRow = Modules.Documents.StrictResult<
  'admin::user',
  Record<never, never>,
  'published'
>;
export type AdminUserRowAssertions = [
  Expect<Equal<[AdminUserRow['username']], [string | null]>>,
  Expect<Equal<[AdminUserRow['preferedLanguage']], [string | null]>>,
  Expect<Equal<['roles' extends keyof AdminUserRow ? true : false], [false]>>,
];

type ReleaseActionService = Services['release-action'];
type Result<TMember extends keyof ReleaseActionService> = Awaited<
  ReturnType<ReleaseActionService[TMember]>
>;

// The rows that `tests/api/core/content-releases/content-releases-service-results.test.api.ts`
// records: the action columns without relations, `locale` present and `null` when not localized.
type ActionRow = Omit<ReleaseAction, 'entry' | 'locale' | 'release' | 'status'> & {
  locale: string | null;
};
type CreatedAction = ActionRow & { release: Pick<Release, 'id'> };

// The callers filter the `release` relation by its ID, which the query engine accepts
// (`countActions filters the release relation by its ID` in the same API test).
type ActionFilters =
  Modules.Documents.Params.Filters.Any<'plugin::content-releases.release-action'>;
type CountActionsFilters =
  ActionFilters | (Omit<ActionFilters, 'release'> & { release: Release['id'] });

export type ReleaseActionServiceContractAssertions = [
  Expect<Equal<[Result<'create'>], [CreatedAction]>>,
  Expect<Equal<[Result<'createMany'>], [{ created: CreatedAction[]; alreadyInRelease: number }]>>,
  Expect<
    Equal<
      [Result<'findPage'>],
      [
        {
          results: Array<ActionRow & Pick<ReleaseAction, 'entry' | 'status'>>;
          pagination: Pagination;
        },
      ]
    >
  >,
  Expect<Equal<[Result<'update'>], [ActionRow]>>,
  Expect<Equal<[Result<'delete'>], [ActionRow]>>,
  // The controller passes the rows of a page, which have no `release`.
  Expect<
    Equal<
      [Parameters<ReleaseActionService['getContentTypeModelsFromActions']>[0]],
      [Array<Pick<ReleaseAction, 'contentType'>>]
    >
  >,
  Expect<
    Equal<
      [Parameters<ReleaseActionService['countActions']>[0]],
      [{ filters?: CountActionsFilters }]
    >
  >,
  Expect<Equal<[Result<'countActions'>], [number]>>,
];

type ReleaseService = Services['release'];
type ReleaseResult<TMember extends keyof ReleaseService> = Awaited<
  ReturnType<ReleaseService[TMember]>
>;

// The row that the same API test records for `update`: the release columns without relations.
type ReleaseRow = Omit<Release, 'actions'>;

export type ReleaseServiceContractAssertions = [
  Expect<Equal<[ReleaseResult<'update'>], [ReleaseRow]>>,
  // The reducer's accumulator in `services/release.ts`: the component schemas by UID.
  Expect<
    Equal<
      [ReleaseResult<'getAllComponents'>],
      [Record<Struct.ComponentSchema['uid'], Struct.ComponentSchema>]
    >
  >,
];

// The reads that the same API test records, called as `controllers/release.ts` calls them.
declare const releaseService: ReleaseService;
const filters = { contentType: 'api::product.product', entryDocumentId: 'abc', locale: null };

// `findByDocumentAttached`, `hasEntryAttached=true`: the requested action fields and the ids.
const findManyWithActionFields = () =>
  releaseService.findMany({
    where: { releasedAt: null, actions: filters },
    populate: { actions: { fields: ['type', 'isEntryValid', 'reason'], filters } },
  });
// `findByDocumentAttached`, `hasEntryAttached=false`: `where` only.
const findManyWithoutPopulate = () => releaseService.findMany({ where: { releasedAt: null } });
// `mapEntriesToReleases`: the full action rows, without `release`, `entry` or `status`.
const findManyWithActions = () =>
  releaseService.findMany({ where: { releasedAt: null }, populate: { actions: true } });
// A populate the contract does not model gives `unknown` for that relation.
const findManyWithActionsCount = () =>
  releaseService.findMany({ populate: { actions: { count: true } } });
// `createdBy` with an object populate, which the contract does not model.
const findManyWithCreatorFields = () =>
  releaseService.findMany({ populate: { createdBy: { fields: ['email'] } } });
// A populate whose value the types cannot read gives `unknown` for every relation.
declare const anyPopulate: string | string[] | undefined;
const findManyWithUnreadPopulate = () => releaseService.findMany({ populate: anyPopulate });
// `findOne` reads with the same query transform as `findMany`.
const findOneWithoutPopulate = () => releaseService.findOne(1);
// `controllers/release.ts` `findOne`: the creator's row without its roles, `null` once the creator
// is deleted (the join column is set to `null`).
const findOneWithCreator = () => releaseService.findOne(1, { populate: ['createdBy'] });
const findManyWithCreator = () => releaseService.findMany({ populate: ['createdBy'] });

export type ReleaseReadContractAssertions = [
  Expect<
    Equal<
      [ReleaseResult<'findPage'>],
      [{ results: Array<ReleaseRow & { actions: { count: number } }>; pagination: Pagination }]
    >
  >,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof findManyWithActionFields>>],
      [
        Array<
          ReleaseRow & {
            actions: Array<
              Pick<ActionRow, 'id' | 'documentId' | 'type' | 'isEntryValid' | 'reason'>
            >;
          }
        >,
      ]
    >
  >,
  Expect<Equal<[Awaited<ReturnType<typeof findManyWithoutPopulate>>], [ReleaseRow[]]>>,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof findManyWithActions>>],
      [Array<ReleaseRow & { actions: ActionRow[] }>]
    >
  >,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof findManyWithActionsCount>>],
      [Array<ReleaseRow & { actions: unknown }>]
    >
  >,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof findManyWithCreatorFields>>],
      [Array<ReleaseRow & { createdBy: unknown }>]
    >
  >,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof findManyWithUnreadPopulate>>],
      [Array<ReleaseRow & { actions: unknown; createdBy: unknown; updatedBy: unknown }>]
    >
  >,
  Expect<Equal<[Awaited<ReturnType<typeof findOneWithoutPopulate>>], [ReleaseRow | null]>>,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof findOneWithCreator>>],
      [(ReleaseRow & { createdBy: AdminUserRow | null }) | null]
    >
  >,
  Expect<
    Equal<
      [Awaited<ReturnType<typeof findManyWithCreator>>],
      [Array<ReleaseRow & { createdBy: AdminUserRow | null }>]
    >
  >,
  // `findByDocumentAttached` filters with `null` values and query-string values.
  Expect<
    Equal<
      [NonNullable<Parameters<ReleaseService['findMany']>[0]>['where']],
      [Record<string, unknown> | undefined]
    >
  >,
];

// The release writes read the user's `id` only (`setCreatorFields` in `services/release.ts`): a
// user read from the `admin::user` service, or `ctx.state.user`, is accepted outside an admin
// request too, e.g. in a bootstrap or a cron.
declare const userRow: AdminUserRow;
declare const developUser: AdminUser;
declare const createBody: Parameters<ReleaseService['create']>[0];
declare const updateBody: Parameters<ReleaseService['update']>[1];
declare const skippedBody: Parameters<ReleaseService['createFromSkippedEntries']>[1];
export const releaseWritesAcceptAdminUsers = async () => {
  await releaseService.create(createBody, { user: userRow });
  await releaseService.create(createBody, { user: developUser });
  await releaseService.update(1, updateBody, { user: userRow });
  await releaseService.createFromSkippedEntries(1, skippedBody, { user: userRow });
  // @ts-expect-error The user's `id` is read.
  await releaseService.create(createBody, { user: {} });
};
