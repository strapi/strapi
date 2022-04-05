import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient, useQueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';

import { NotificationsProvider, useNotification } from '@strapi/helper-plugin';
import { deleteRequest } from '../../utils/deleteRequest';

import { useRemoveFolder } from '../useRemoveFolder';

const FOLDER_FIXTURE = {
  id: 1,
  name: 'test-folder',
  parent: 1,
};

console.error = jest.fn();

jest.mock('../../utils/deleteRequest', () => ({
  ...jest.requireActual('../../utils/deleteRequest'),
  deleteRequest: jest.fn().mockResolvedValue({ id: 1 }),
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
    <QueryClientProvider client={client}>
      <NotificationsProvider toggleNotification={() => jest.fn()}>
        <IntlProvider locale="en" messages={{}}>
          {children}
        </IntlProvider>
      </NotificationsProvider>
    </QueryClientProvider>
  );
}

function setup(...args) {
  return new Promise(resolve => {
    act(() => {
      resolve(renderHook(() => useRemoveFolder(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useRemoveFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls the proper endpoint', async () => {
    const {
      result: { current },
      waitFor,
    } = await setup();
    const { removeFolder } = current;

    await act(async () => {
      await removeFolder(FOLDER_FIXTURE);
    });

    await waitFor(() => expect(deleteRequest).toBeCalledWith('folders', FOLDER_FIXTURE));
  });

  test('calls toggleNotification in case of an success', async () => {
    const toggleNotification = useNotification();
    const {
      result: { current },
      waitFor,
    } = await setup();
    const { removeFolder } = current;

    try {
      await act(async () => {
        await removeFolder(FOLDER_FIXTURE);
      });
    } catch (err) {
      // ...
    }

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
    );
  });

  test('does call refetchQueries in case of success', async () => {
    const queryClient = useQueryClient();
    const {
      result: { current },
      waitFor,
    } = await setup();
    const { removeFolder } = current;

    await act(async () => {
      await removeFolder(FOLDER_FIXTURE);
    });

    await waitFor(() =>
      expect(queryClient.refetchQueries).toHaveBeenCalledWith(['upload', 'folders'], {
        active: true,
      })
    );
  });

  test('calls toggleNotification in case of an error', async () => {
    deleteRequest.mockRejectedValue({ message: 'error-msg' });

    const toggleNotification = useNotification();
    const {
      result: { current },
      waitFor,
    } = await setup();
    const { removeFolder } = current;

    try {
      await act(async () => {
        await removeFolder(FOLDER_FIXTURE);
      });
    } catch (err) {
      // ...
    }

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'warning', message: 'error-msg' })
      )
    );
  });
});
