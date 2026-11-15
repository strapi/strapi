import type { GetReleases } from '../../../../shared/contracts/releases';

type ReleaseRow = GetReleases.Response['data'][number];

const createRelease = (
  release: Partial<ReleaseRow> & Pick<ReleaseRow, 'id' | 'name'>
): ReleaseRow => ({
  documentId: `release-${release.id}`,
  releasedAt: null,
  scheduledAt: null,
  timezone: null,
  status: 'empty',
  releaseCondition: 'all_or_nothing',
  totalPublishedEntries: null,
  totalUnpublishedEntries: null,
  totalSkippedEntries: null,
  failureReason: null,
  createdAt: '2023-11-16T15:18:32.560Z',
  updatedAt: '2023-11-16T15:18:32.560Z',
  actions: { meta: { count: 0 } },
  createdBy: {
    id: 1,
    firstname: 'Admin',
    lastname: 'Admin',
    isActive: true,
    blocked: false,
    roles: [],
    createdAt: '2023-11-16T15:18:32.560Z',
    updatedAt: '2023-11-16T15:18:32.560Z',
  },
  ...release,
});

/* -------------------------------------------------------------------------------------------------
 * EMPTY_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const EMPTY_MOCK_DATA = {
  data: [],
  meta: {
    pagination: {
      page: 1,
      pageSize: 16,
      pageCount: 0,
      total: 0,
    },
    pendingReleasesCount: 0,
    statusCounts: { ready: 0, blocked: 0, failed: 0, done: 0, partial: 0, empty: 0 },
  },
} satisfies GetReleases.Response;

/* -------------------------------------------------------------------------------------------------
 * PENDING_RELEASES_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const PENDING_RELEASES_MOCK_DATA = {
  data: Array.from({ length: 17 }, (_, index) =>
    createRelease({ id: index + 1, name: `entry ${index + 1}` })
  ),
  meta: {
    pagination: {
      page: 1,
      pageSize: 16,
      pageCount: 2,
      total: 17,
    },
    pendingReleasesCount: 17,
    statusCounts: { ready: 0, blocked: 0, failed: 0, done: 0, partial: 0, empty: 17 },
  },
} satisfies GetReleases.Response;

/* -------------------------------------------------------------------------------------------------
 * RELEASES_BY_STATUS_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const RELEASES_BY_STATUS_MOCK_DATA = {
  data: [
    createRelease({ id: 1, name: 'Holiday newsletter', releaseCondition: 'allow_partial' }),
    createRelease({
      id: 2,
      name: 'Homepage refresh',
      status: 'ready',
      releaseCondition: 'allow_partial',
      scheduledAt: '2026-10-15T09:00:00.000Z',
      timezone: 'UTC',
      actions: { meta: { count: 18, notReadyCount: 3 } },
    }),
    createRelease({
      id: 3,
      name: 'Black Friday prep',
      status: 'blocked',
      scheduledAt: '2026-11-20T09:00:00.000Z',
      timezone: 'UTC',
      actions: { meta: { count: 24, notReadyCount: 24 } },
    }),
    createRelease({
      id: 4,
      name: 'Empty campaign',
      status: 'done',
      scheduledAt: '2026-09-02T09:00:00.000Z',
      releasedAt: '2026-09-02T09:00:00.000Z',
      timezone: 'UTC',
    }),
    createRelease({
      id: 5,
      name: 'Autumn campaign',
      status: 'partial',
      releasedAt: '2026-09-02T09:00:00.000Z',
      actions: { meta: { count: 5 } },
    }),
    createRelease({
      id: 6,
      name: 'Summer campaign',
      status: 'failed',
      releasedAt: '2026-09-02T09:00:00.000Z',
      actions: { meta: { count: 5 } },
    }),
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 16,
      pageCount: 1,
      total: 6,
    },
    pendingReleasesCount: 3,
    statusCounts: { ready: 1, blocked: 1, failed: 1, done: 1, partial: 1, empty: 1 },
  },
} satisfies GetReleases.Response;

const mockReleasesPageData = {
  emptyEntries: EMPTY_MOCK_DATA,
  pendingEntries: PENDING_RELEASES_MOCK_DATA,
  releasesByStatus: RELEASES_BY_STATUS_MOCK_DATA,
} as const;

type MockReleasesPageData = typeof mockReleasesPageData;

export { mockReleasesPageData };
export type { MockReleasesPageData };
