/* -------------------------------------------------------------------------------------------------
 * RELEASE_NO_ACTIONS_HEADER_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const RELEASE_NO_ACTIONS_HEADER_MOCK_DATA = {
  data: {
    id: 1,
    name: 'release no actions',
    createdAt: '2023-11-16T15:18:32.560Z',
    updatedAt: '2023-11-16T15:18:32.560Z',
    releasedAt: null,
    actions: {
      meta: {
        total: 0,
        totalHidden: 0,
      },
    },
  },
};

/* -------------------------------------------------------------------------------------------------
 * RELEASE_NO_ACTIONS_BODY_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const RELEASE_NO_ACTIONS_BODY_MOCK_DATA = {
  data: [],
  meta: {
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      pageCount: 0,
    },
  },
};

/* -------------------------------------------------------------------------------------------------
 * RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA = {
  data: {
    id: 2,
    name: 'release with actions',
    createdAt: '2023-11-16T15:18:32.560Z',
    updatedAt: '2023-11-16T15:18:32.560Z',
    releasedAt: null,
    actions: {
      meta: {
        total: 1,
        totalHidden: 0,
      },
    },
  },
};

/* -------------------------------------------------------------------------------------------------
 * RELEASE_WITH_ACTIONS_BODY_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/
const RELEASE_WITH_ACTIONS_BODY_MOCK_DATA = {
  data: [
    {
      id: 3,
      type: 'publish',
      contentType: 'api::category.category',
      createdAt: '2023-12-05T09:03:57.155Z',
      updatedAt: '2023-12-05T09:03:57.155Z',
      entry: {
        id: 1,
        mainField: 'cat1',
        locale: 'en',
      },
    },
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 10,
      total: 1,
      pageCount: 1,
    },
  },
};

const mockReleaseDetailsPageData = {
  noActionsHeaderData: RELEASE_NO_ACTIONS_HEADER_MOCK_DATA,
  noActionsBodyData: RELEASE_NO_ACTIONS_BODY_MOCK_DATA,
  withActionsHeaderData: RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA,
  withActionsBodyData: RELEASE_WITH_ACTIONS_BODY_MOCK_DATA,
} as const;

type MockReleaseDetailsPageData = typeof mockReleaseDetailsPageData;

export { mockReleaseDetailsPageData };
export type { MockReleaseDetailsPageData };
