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
  },
};

/* -------------------------------------------------------------------------------------------------
 * PENDING_RELEASES_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const PENDING_RELEASES_MOCK_DATA = {
  data: [
    {
      id: 1,
      name: 'entry 1',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:32.560Z',
      updatedAt: '2023-11-16T15:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 2,
      name: 'entry 2',
      releasedAt: null,
      createdAt: '2023-11-17T15:18:32.560Z',
      updatedAt: '2023-11-17T15:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 3,
      name: 'entry 3',
      releasedAt: null,
      createdAt: '2023-11-18T15:18:32.560Z',
      updatedAt: '2023-11-18T15:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 4,
      name: 'entry 4',
      releasedAt: null,
      createdAt: '2023-11-18T15:18:32.560Z',
      updatedAt: '2023-11-18T15:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 5,
      name: 'entry 5',
      releasedAt: null,
      createdAt: '2023-11-19T15:18:32.560Z',
      updatedAt: '2023-11-19T15:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 6,
      name: 'entry 6',
      releasedAt: null,
      createdAt: '2023-11-20T15:18:32.560Z',
      updatedAt: '2023-11-20T15:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 7,
      name: 'entry 7',
      releasedAt: null,
      createdAt: '2023-11-17T15:18:32.560Z',
      updatedAt: '2023-11-17T15:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 8,
      name: 'entry 8',
      releasedAt: null,
      createdAt: '2023-11-16T17:18:32.560Z',
      updatedAt: '2023-11-16T17:18:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 9,
      name: 'entry 9',
      releasedAt: null,
      createdAt: '2023-11-16T15:19:32.560Z',
      updatedAt: '2023-11-16T15:19:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 10,
      name: 'entry 10',
      releasedAt: null,
      createdAt: '2023-11-16T15:20:32.560Z',
      updatedAt: '2023-11-16T15:20:32.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 11,
      name: 'entry 11',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:33.560Z',
      updatedAt: '2023-11-16T15:18:33.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 12,
      name: 'entry 12',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:34.560Z',
      updatedAt: '2023-11-16T15:18:34.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 13,
      name: 'entry 13',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:35.560Z',
      updatedAt: '2023-11-16T15:18:35.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 14,
      name: 'entry 14',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:36.560Z',
      updatedAt: '2023-11-16T15:18:36.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 15,
      name: 'entry 15',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:37.560Z',
      updatedAt: '2023-11-16T15:18:37.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 16,
      name: 'prova 16',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:38.560Z',
      updatedAt: '2023-11-16T15:18:38.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
    {
      id: 17,
      name: 'entry 17',
      releasedAt: null,
      createdAt: '2023-11-16T15:18:39.560Z',
      updatedAt: '2023-11-16T15:18:39.560Z',
      actions: {
        meta: {
          count: 0,
        },
      },
    },
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 16,
      pageCount: 2,
      total: 17,
    },
    pendingReleasesCount: 17,
  },
};

const mockReleasesPageData = {
  emptyEntries: EMPTY_MOCK_DATA,
  pendingEntries: PENDING_RELEASES_MOCK_DATA,
} as const;

type MockReleasesPageData = typeof mockReleasesPageData;

export { mockReleasesPageData };
export type { MockReleasesPageData };
