// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { SanitizedAdminUser } from '@strapi/admin/strapi-admin';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';
import type { Pagination, Release, ReleaseDataResponse } from '../../../shared/contracts/releases';
import type { Services } from './index';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// The shared contracts name the admin user that the admin panel exports, without loading the panel.
declare const checks: [Expect<Equal<ReleaseDataResponse['createdBy'], SanitizedAdminUser>>];
checks satisfies unknown;

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
];
