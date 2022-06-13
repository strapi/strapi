import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient, useQueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { NotificationsProvider, useNotification } from '@strapi/helper-plugin';

import { axiosInstance } from '../../utils';
import { useEditFolder } from '../useEditFolder';

const FOLDER_CREATE_FIXTURE = {
  name: 'test-folder',
  parent: 1,
};

const FOLDER_EDIT_FIXTURE = {
  id: 2,
  name: 'test-folder',
  parent: 1,
};

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  axiosInstance: {
    put: jest.fn().mockResolvedValue({ name: 'folder-edited' }),
    post: jest.fn().mockResolvedValue({ name: 'folder-created' }),
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
      resolve(renderHook(() => useEditFolder(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useEditFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls the proper endpoint when creating a folder (post)', async () => {
    const {
      result: { current },
    } = await setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(FOLDER_CREATE_FIXTURE);
    });

    expect(axiosInstance.post).toHaveBeenCalledWith('/upload/folders/', expect.any(Object));
  });

  test('calls the proper endpoint when creating a folder (put)', async () => {
    const {
      result: { current },
    } = await setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(
        {
          name: FOLDER_EDIT_FIXTURE.name,
          parent: FOLDER_EDIT_FIXTURE.parent,
        },
        FOLDER_EDIT_FIXTURE.id
      );
    });

    expect(axiosInstance.put).toHaveBeenCalledWith('/upload/folders/2', expect.any(Object));
  });

  test('calls the proper endpoint when editing a folder', async () => {
    const {
      result: { current },
    } = await setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(
        {
          name: FOLDER_EDIT_FIXTURE.name,
          parent: FOLDER_EDIT_FIXTURE.parent,
        },
        FOLDER_EDIT_FIXTURE.id
      );
    });

    expect(axiosInstance.put).toHaveBeenCalledWith('/upload/folders/2', expect.any(Object));
  });

  test('does not call toggleNotification in case of success', async () => {
    const toggleNotification = useNotification();
    const {
      result: { current },
    } = await setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(
        {
          name: FOLDER_EDIT_FIXTURE.name,
          parent: FOLDER_EDIT_FIXTURE.parent,
        },
        FOLDER_EDIT_FIXTURE.id
      );
    });

    expect(toggleNotification).not.toHaveBeenCalled();
  });

  test('does call refetchQueries in case of success', async () => {
    const queryClient = useQueryClient();
    const {
      result: { current },
      waitFor,
    } = await setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(
        {
          name: FOLDER_EDIT_FIXTURE.name,
          parent: FOLDER_EDIT_FIXTURE.parent,
        },
        FOLDER_EDIT_FIXTURE.id
      );
    });

    await waitFor(() =>
      expect(queryClient.refetchQueries).toHaveBeenCalledWith(['upload', 'folders'], {
        active: true,
      })
    );
  });

  test('calls toggleNotification in case of an error', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    axiosInstance.put.mockRejectedValue({ message: 'err-test' });

    const toggleNotification = useNotification();
    const {
      result: { current },
      waitFor,
    } = await setup();
    const { editFolder } = current;

    try {
      await act(async () => {
        await editFolder(
          {
            name: FOLDER_EDIT_FIXTURE.name,
            parent: FOLDER_EDIT_FIXTURE.parent,
          },
          FOLDER_EDIT_FIXTURE.id
        );
      });
    } catch (err) {
      // ...
    }

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'err-test' })
      )
    );

    console.error = originalConsoleError;
  });
});
