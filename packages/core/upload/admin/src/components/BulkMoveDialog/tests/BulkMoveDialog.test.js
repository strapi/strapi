import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render, fireEvent, screen, within, waitFor } from '@testing-library/react';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { QueryClientProvider, QueryClient } from 'react-query';

import { BulkMoveDialog } from '..';
import { useBulkMove } from '../../../hooks/useBulkMove';

jest.mock('../../../hooks/useFolderStructure');
jest.mock('../../../hooks/useBulkMove');

const FIXTURE_PARENT_FOLDER = {
  id: 2,
  name: 'default folder name',
  updatedAt: '2022-06-21T15:35:36.932Z',
  createdAt: '2022-06-21T07:04:49.813Z',
  parent: null,
  path: '/2',
  pathId: 2,
};

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function ComponentFixture(props) {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <NotificationsProvider toggleNotification={() => {}}>
            <BulkMoveDialog {...props} />
          </NotificationsProvider>
        </ThemeProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

function setup(props = { onClose: jest.fn(), selected: [] }) {
  return render(<ComponentFixture {...props} />, { container: document.getElementById('app') });
}

describe('BulkMoveDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders and matches the snapshot', () => {
    setup();
    expect(document.body).toMatchSnapshot();
  });

  test('closes the modal', () => {
    const spy = jest.fn();
    setup({ onClose: spy, selected: [] });

    fireEvent.click(
      screen.getByRole('button', {
        name: /close the modal/i,
      })
    );

    expect(spy).toBeCalledTimes(1);
  });

  test('set default form values', () => {
    setup({ onClose: jest.fn(), selected: [] });

    expect(screen.getByText('Media Library')).toBeInTheDocument();
  });

  test('set default form values with parentFolder', () => {
    setup({ parentFolder: FIXTURE_PARENT_FOLDER, onClose: jest.fn(), selected: [] });

    expect(screen.getByText(FIXTURE_PARENT_FOLDER.name)).toBeInTheDocument();
  });

  test('keeps move folder dialog open and show error message on API error', async () => {
    const FIXTURE_ERROR_MESSAGE =
      'folders cannot be moved inside themselves or one of its children';
    const moveSpy = jest.fn().mockRejectedValueOnce({
      response: {
        data: {
          error: {
            details: {
              errors: [
                {
                  path: ['destination'],
                  message: FIXTURE_ERROR_MESSAGE,
                },
              ],
            },
          },
        },
      },
    });
    useBulkMove.mockReturnValueOnce({
      move: moveSpy,
    });

    const { getByText } = setup({
      onClose: jest.fn(),
      selected: [],
      parentFolder: FIXTURE_PARENT_FOLDER,
    });

    const dialog = screen.getByRole('dialog');
    const submit = within(dialog).getByRole('button', {
      name: /move/i,
    });
    fireEvent.click(submit);

    await waitFor(() => expect(moveSpy).toBeCalledWith(2, []));

    expect(getByText(FIXTURE_ERROR_MESSAGE)).toBeInTheDocument();
  });
});
