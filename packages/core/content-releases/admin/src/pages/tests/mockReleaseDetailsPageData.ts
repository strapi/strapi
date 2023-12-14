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
    createdBy: {
      id: 1,
      firstname: 'Admin',
      lastname: 'Admin',
      username: null,
    },
    actions: {
      meta: {
        count: 0,
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
    createdBy: {
      id: 1,
      firstname: 'Admin',
      lastname: 'Admin',
      username: null,
    },
    actions: {
      meta: {
        count: 1,
      },
    },
  },
};

/* -------------------------------------------------------------------------------------------------
 * PUBLISHED_RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const PUBLISHED_RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA = {
  data: {
    id: 2,
    name: 'release with actions',
    createdAt: '2023-11-16T15:18:32.560Z',
    updatedAt: '2023-11-16T15:18:32.560Z',
    releasedAt: '2023-11-16T15:18:32.560Z',
    createdBy: {
      id: 1,
      firstname: 'Admin',
      lastname: 'Admin',
      username: null,
    },
    actions: {
      meta: {
        count: 1,
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
        contentType: {
          displayName: 'Category',
          mainFieldValue: 'cat1',
        },
        locale: {
          name: 'English (en)',
          code: 'en',
        },
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
  withActionsAndPublishedHeaderData: PUBLISHED_RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA,
} as const;

type MockReleaseDetailsPageData = typeof mockReleaseDetailsPageData;

export { mockReleaseDetailsPageData };
export type { MockReleaseDetailsPageData };
