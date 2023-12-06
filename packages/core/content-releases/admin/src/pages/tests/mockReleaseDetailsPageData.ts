/* -------------------------------------------------------------------------------------------------
 * RELEASE_NO_ENTRIES_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const RELEASE_NO_ENTRIES_MOCK_DATA = {
  data: {
    id: 1,
    name: 'release no actions',
    createdAt: '2023-11-16T15:18:32.560Z',
    updatedAt: '2023-11-16T15:18:32.560Z',
    releasedAt: null,
    actions: {
      meta: {
        count: 0,
      },
    },
  },
};

/* -------------------------------------------------------------------------------------------------
 * RELEASE_WITH_ENTRIES_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const RELEASE_WITH_ENTRIES_MOCK_DATA = {
  data: {
    id: 2,
    name: 'release with actions',
    createdAt: '2023-11-16T15:18:32.560Z',
    updatedAt: '2023-11-16T15:18:32.560Z',
    releasedAt: null,
    actions: {
      meta: {
        count: 3,
      },
    },
  },
};

const mockReleaseDetailsPageData = {
  noEntries: RELEASE_NO_ENTRIES_MOCK_DATA,
  withEntries: RELEASE_WITH_ENTRIES_MOCK_DATA,
} as const;

type MockReleaseDetailsPageData = typeof mockReleaseDetailsPageData;

export { mockReleaseDetailsPageData };
export type { MockReleaseDetailsPageData };
