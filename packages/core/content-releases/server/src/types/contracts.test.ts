// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Data, Modules, Schema, Struct, UID } from '@strapi/types';
import type { SanitizedAdminUser } from '@strapi/admin/strapi-admin';
import type { AdminUser } from '@strapi/admin/strapi-server';
import type {
  ReleaseAction,
  ReleaseActionOutcome,
  ReleaseActionReason,
} from '../../../shared/contracts/release-actions';
import type {
  Pagination,
  Release,
  ReleaseCondition,
  ReleaseDataResponse,
  ReleaseFailureReason,
  ReleaseStatus,
} from '../../../shared/contracts/releases';
import type { ReleaseActionService as ReleaseActionImplementation } from '../services/release-action';
import type { Services } from './index';

// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
type Equal<T, U> =
  (<V>() => V extends [T] ? 1 : 2) extends <V>() => V extends [U] ? 1 : 2 ? true : false;
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
// records: the columns of the registered release-action schema without relations, every column
// possibly `null`, `locale` present and `null` when not localized. `contentType`, `entryDocumentId`
// and `reason` keep the domain types of `ReleaseAction`.
type ActionColumns = Modules.Documents.StrictResult<
  'plugin::content-releases.release-action',
  Record<never, never>,
  'published'
>;
type ActionRow = Omit<ActionColumns, 'contentType' | 'entryDocumentId' | 'reason'> &
  Pick<ReleaseAction, 'contentType' | 'entryDocumentId' | 'reason'>;
type CreatedAction = ActionRow & { release: Pick<Release, 'id'> };

// The entry of a page row: the deep-populated document, its `locale` `null` when the content type
// is not localized (`release-action.findPage` in the same API test, and the typed-vs-runtime
// comparison of `content-releases-service-shapes.test.api.ts`).
type PageRowEntry = Modules.Documents.AnyDocument & {
  [key: string]: Schema.Attribute.AnyAttribute;
} & { locale?: string | null };
type PageRow = ActionRow & { entry: PageRowEntry | null; status: ReleaseAction['status'] };

export type PageRowAssertions = [
  Expect<Equal<[PageRowEntry['locale']], [string | null | undefined]>>,
  Expect<Equal<[PageRowEntry['documentId']], [string]>>,
  Expect<Equal<[PageRowEntry['id']], [Data.ID]>>,
];

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
          results: PageRow[];
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

// `controllers/release-action.ts` groups the rows of a page, which have no `release`, by the query's
// `sort`. `groupActions` reads the content type, the locale and the entry of each action.
declare const releaseActionService: ReleaseActionService;
export const groupPageRows = async () => {
  const page = await releaseActionService.findPage('1', { page: 1, pageSize: 10 });
  const grouped = await releaseActionService.groupActions(page.results, 'contentType');
  // @ts-expect-error Each action names its content type.
  await releaseActionService.groupActions([{ locale: 'en', entry: null }], 'type');
  // @ts-expect-error Not a grouping.
  await releaseActionService.groupActions(page.results, 'unknown');
  return grouped;
};

type GroupedPageRow = Awaited<ReturnType<typeof groupPageRows>>[string][number];
// The item that the implementation formats: the action with its locale and content type resolved.
type FormattedAction = Awaited<
  ReturnType<ReleaseActionImplementation['groupActions']>
>[string][number];

export type GroupActionsContractAssertions = [
  Expect<Equal<['release' extends keyof GroupedPageRow ? true : false], [false]>>,
  Expect<Equal<[GroupedPageRow['locale']], [FormattedAction['locale']]>>,
  // Written out: the published declaration prints the inferred `mainFieldValue` as `any`.
  Expect<
    Equal<
      [GroupedPageRow['contentType']],
      [{ uid: UID.ContentType; displayName: string; mainFieldValue?: unknown }]
    >
  >,
  Expect<
    Equal<
      [FormattedAction['contentType'] extends GroupedPageRow['contentType'] ? true : false],
      [true]
    >
  >,
  Expect<Equal<[GroupedPageRow['entry']], [PageRowEntry | null]>>,
  Expect<Equal<[GroupedPageRow['status']], [ReleaseAction['status']]>>,
];

type ReleaseService = Services['release'];
type ReleaseResult<TMember extends keyof ReleaseService> = Awaited<
  ReturnType<ReleaseService[TMember]>
>;

// The row that the same API test records for `update`: the columns of the registered release
// schema without relations, every column possibly `null` but `name`, which the create and update
// validation requires.
type ReleaseRow = Omit<
  Modules.Documents.StrictResult<
    'plugin::content-releases.release',
    Record<never, never>,
    'published'
  >,
  'name'
> &
  Pick<Release, 'name'>;

export type RowAssertions = [
  // The columns the API test records, `publishedAt` and `locale` included.
  Expect<
    Equal<
      [keyof ReleaseRow],
      [
        | 'id'
        | 'documentId'
        | 'name'
        | 'releasedAt'
        | 'scheduledAt'
        | 'timezone'
        | 'status'
        | 'releaseCondition'
        | 'totalPublishedEntries'
        | 'totalUnpublishedEntries'
        | 'totalSkippedEntries'
        | 'failureReason'
        | 'createdAt'
        | 'updatedAt'
        | 'publishedAt'
        | 'locale',
      ]
    >
  >,
  Expect<Equal<[ReleaseRow['name']], [string]>>,
  Expect<Equal<[ReleaseRow['status']], [ReleaseStatus | null]>>,
  Expect<Equal<[ReleaseRow['releaseCondition']], [ReleaseCondition | null]>>,
  Expect<Equal<[ReleaseRow['failureReason']], [ReleaseFailureReason | null]>>,
  Expect<Equal<[ReleaseRow['totalPublishedEntries']], [number | null]>>,
  Expect<Equal<[ReleaseRow['locale']], [string | null]>>,
  Expect<
    Equal<
      [keyof ActionRow],
      [
        | 'id'
        | 'documentId'
        | 'type'
        | 'contentType'
        | 'entryDocumentId'
        | 'locale'
        | 'isEntryValid'
        | 'outcome'
        | 'reason'
        | 'createdAt'
        | 'updatedAt'
        | 'publishedAt',
      ]
    >
  >,
  Expect<Equal<[ActionRow['type']], [ReleaseAction['type'] | null]>>,
  Expect<Equal<[ActionRow['contentType']], [UID.ContentType]>>,
  Expect<Equal<[ActionRow['entryDocumentId']], [ReleaseAction['entryDocumentId']]>>,
  Expect<Equal<[ActionRow['locale']], [string | null]>>,
  Expect<Equal<[ActionRow['isEntryValid']], [boolean | null]>>,
  Expect<Equal<[ActionRow['outcome']], [ReleaseActionOutcome | null]>>,
  Expect<Equal<[ActionRow['reason']], [ReleaseActionReason | null]>>,
];

export type ReleaseServiceContractAssertions = [
  Expect<Equal<[ReleaseResult<'update'>], [ReleaseRow]>>,
  // `create` resolves the inserted row, without its `actions` (same API test).
  Expect<Equal<[ReleaseResult<'create'>], [ReleaseRow]>>,
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
