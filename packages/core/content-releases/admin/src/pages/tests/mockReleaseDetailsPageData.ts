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
    status: 'empty',
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
    status: 'ready',
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
    id: 3,
    name: 'release with actions',
    createdAt: '2023-11-16T15:18:32.560Z',
    updatedAt: '2023-11-16T15:18:32.560Z',
    releasedAt: '2023-11-16T15:18:32.560Z',
    status: 'done',
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
  data: {
    Category: [
      {
        id: 3,
        type: 'publish',
        createdAt: '2023-12-05T09:03:57.155Z',
        updatedAt: '2023-12-05T09:03:57.155Z',
        contentType: {
          displayName: 'Category',
          mainFieldValue: 'cat1',
          uid: 'api::category.category',
        },
        locale: {
          name: 'English (en)',
          code: 'en',
        },
        entry: {
          id: 1,
        },
      },
    ],
  },
  meta: {
    pagination: {
      page: 1,
      pageSize: 10,
      total: 1,
      pageCount: 1,
    },
    contentTypes: {},
    components: {},
  },
};

/* -------------------------------------------------------------------------------------------------
 * RELEASE_WITH_MULTIPLE_ACTIONS_BODY_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/
const RELEASE_WITH_MULTIPLE_ACTIONS_BODY_MOCK_DATA = {
  data: {
    Category: [
      {
        id: 3,
        type: 'publish',
        createdAt: '2023-12-05T09:03:57.155Z',
        updatedAt: '2023-12-05T09:03:57.155Z',
        contentType: {
          displayName: 'Category',
          mainFieldValue: 'cat1',
          uid: 'api::category.category',
        },
        locale: {
          name: 'English (en)',
          code: 'en',
        },
        entry: {
          id: 1,
          publishedAt: null,
        },
      },
      {
        id: 4,
        type: 'unpublish',
        createdAt: '2023-12-05T09:03:57.155Z',
        updatedAt: '2023-12-05T09:03:57.155Z',
        contentType: {
          displayName: 'Category',
          mainFieldValue: 'cat2',
          uid: 'api::category.category',
        },
        locale: {
          name: 'English (en)',
          code: 'en',
        },
        entry: {
          id: 2,
          publishedAt: '2023-12-05T09:03:57.155Z',
        },
      },
    ],
    Address: [
      {
        id: 5,
        type: 'publish',
        createdAt: '2023-12-05T09:03:57.155Z',
        updatedAt: '2023-12-05T09:03:57.155Z',
        contentType: {
          displayName: 'Address',
          mainFieldValue: 'add1',
          uid: 'api::address.address',
        },
        locale: {
          name: 'English (en)',
          code: 'en',
        },
        entry: {
          id: 1,
          publishedAt: '2023-12-05T09:03:57.155Z',
        },
      },
    ],
  },
  meta: {
    pagination: {
      page: 1,
      pageSize: 10,
      total: 1,
      pageCount: 1,
    },
    contentTypes: {},
    components: {},
  },
};

const mockReleaseDetailsPageData = {
  noActionsHeaderData: RELEASE_NO_ACTIONS_HEADER_MOCK_DATA,
  noActionsBodyData: RELEASE_NO_ACTIONS_BODY_MOCK_DATA,
  withActionsHeaderData: RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA,
  withActionsBodyData: RELEASE_WITH_ACTIONS_BODY_MOCK_DATA,
  withMultipleActionsBodyData: RELEASE_WITH_MULTIPLE_ACTIONS_BODY_MOCK_DATA,
  withActionsAndPublishedHeaderData: PUBLISHED_RELEASE_WITH_ACTIONS_HEADER_MOCK_DATA,
} as const;

type MockReleaseDetailsPageData = typeof mockReleaseDetailsPageData;

export { mockReleaseDetailsPageData };
export type { MockReleaseDetailsPageData };
