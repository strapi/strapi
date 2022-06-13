import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient, useQueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { NotificationsProvider, useNotification } from '@strapi/helper-plugin';

import { axiosInstance } from '../../utils';
import { useBulkMove } from '../useBulkMove';

const FIXTURE_ASSETS = [
  {
    id: 1,
    type: 'asset',
  },

  {
    id: 2,
    type: 'asset',
  },
];

const FIXTURE_FOLDERS = [
  {
    id: 11,
    type: 'folder',
  },

  {
    id: 12,
    type: 'folder',
  },
];

const FIXTURE_DESTINATION_FOLDER_ID = 1;

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  axiosInstance: {
    post: jest.fn((url, payload) => {
      const res = { data: { data: {} } };

      if (payload?.fileIds) {
        res.data.data.files = FIXTURE_ASSETS;
      }

      if (payload?.folderIds) {
        res.data.data.folders = FIXTURE_FOLDERS;
      }

      return Promise.resolve(res);
    }),
  },
}));

const notificationStatusMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => notificationStatusMock,
}));

const refetchQueriesMock = jest.fn();

jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQueryClient: () => ({
    refetchQueries: refetchQueriesMock,
  }),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// eslint-disable-next-line react/prop-types
function ComponentFixture({ children }) {
  return (
    <Router>
      <Route>
        <QueryClientProvider client={client}>
          <NotificationsProvider toggleNotification={() => jest.fn()}>
            <IntlProvider locale="en" messages={{}}>
              {children}
            </IntlProvider>
          </NotificationsProvider>
        </QueryClientProvider>
      </Route>
    </Router>
  );
}

function setup(...args) {
  return new Promise(resolve => {
    act(() => {
      resolve(renderHook(() => useBulkMove(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useBulkMove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does call the proper endpoint', async () => {
    const {
      result: { current },
    } = await setup();
    const { move } = current;

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_ASSETS);
    });

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/upload/actions/bulk-move',
      expect.any(Object)
    );
  });

  test('does properly collect all asset ids', async () => {
    const {
      result: { current },
    } = await setup();
    const { move } = current;

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_ASSETS);
    });

    expect(axiosInstance.post).toHaveBeenCalledWith(expect.any(String), {
      destinationFolderId: FIXTURE_DESTINATION_FOLDER_ID,
      fileIds: FIXTURE_ASSETS.map(({ id }) => id),
    });
  });

  test('does properly collect all folder ids', async () => {
    const {
      result: { current },
    } = await setup();
    const { move } = current;

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_FOLDERS);
    });

    expect(axiosInstance.post).toHaveBeenCalledWith(expect.any(String), {
      destinationFolderId: FIXTURE_DESTINATION_FOLDER_ID,
      folderIds: FIXTURE_FOLDERS.map(({ id }) => id),
    });
  });

  test('does properly collect folder and asset ids', async () => {
    const {
      result: { current },
    } = await setup();
    const { move } = current;

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, [...FIXTURE_FOLDERS, ...FIXTURE_ASSETS]);
    });

    expect(axiosInstance.post).toHaveBeenCalledWith(expect.any(String), {
      destinationFolderId: FIXTURE_DESTINATION_FOLDER_ID,
      fileIds: FIXTURE_ASSETS.map(({ id }) => id),
      folderIds: FIXTURE_FOLDERS.map(({ id }) => id),
    });
  });

  test('does re-fetch assets, if files were deleted', async () => {
    const toggleNotification = useNotification();
    const queryClient = useQueryClient();

    const {
      result: { current },
      waitFor,
    } = await setup();
    const { move } = current;

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_ASSETS);
    });

    await waitFor(() =>
      expect(queryClient.refetchQueries).toHaveBeenCalledWith(['upload', 'assets'], {
        active: true,
      })
    );

    await waitFor(() => expect(toggleNotification).toHaveBeenCalled());
  });

  test('does re-fetch folders, if folders were deleted', async () => {
    const queryClient = useQueryClient();
    const toggleNotification = useNotification();

    const {
      result: { current },
      waitFor,
    } = await setup();
    const { move } = current;

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_FOLDERS);
    });

    await waitFor(() =>
      expect(queryClient.refetchQueries).toHaveBeenCalledWith(['upload', 'folders'], {
        active: true,
      })
    );

    await waitFor(() => expect(toggleNotification).toHaveBeenCalled());
  });
});
