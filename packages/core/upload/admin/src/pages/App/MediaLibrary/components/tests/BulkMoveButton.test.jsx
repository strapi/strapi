import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { within } from '@testing-library/dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { useBulkMove } from '../../../../../hooks/useBulkMove';
import { BulkMoveButton } from '../BulkMoveButton';

jest.mock('../../../../../hooks/useBulkMove');
jest.mock('../../../../../hooks/useFolderStructure');

const FIXTURE_SELECTION = [
  {
    type: 'asset',
    createdAt: '2022-06-21T07:04:49.813Z',
    updatedAt: '2022-06-21T07:04:49.813Z',
    pathId: 1,
    path: '/1',
    files: { count: 0 },
    id: 1,
    children: { count: 0 },
    name: 'test',
  },
];

const setup = (
  props = {
    selected: [],
    onSuccess: jest.fn(),
  }
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider>
        <MemoryRouter>
          <IntlProvider locale="en">
            <BulkMoveButton {...props} />
          </IntlProvider>
        </MemoryRouter>
      </DesignSystemProvider>
    </QueryClientProvider>
  );
};

describe('BulkMoveButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });

  test('opens destination dialog before the API call', async () => {
    const onSuccessSpy = jest.fn();
    const { getByText } = setup({
      onSuccess: onSuccessSpy,
      selected: FIXTURE_SELECTION,
    });
    const moveSpy = jest.fn().mockResolvedValueOnce({});

    useBulkMove.mockReturnValueOnce({
      isLoading: false,
      error: null,
      move: moveSpy,
    });

    act(() => {
      fireEvent.click(getByText('Move'));
    });

    expect(getByText('Move elements to')).toBeInTheDocument();

    act(() => {
      const dialog = screen.getByRole('dialog');
      const submit = within(dialog).getByRole('button', {
        name: /move/i,
      });
      fireEvent.click(submit);
    });

    await waitFor(() => expect(moveSpy).toBeCalledWith('', FIXTURE_SELECTION));
    await waitFor(() => expect(onSuccessSpy).toBeCalled());
  });

  test('set default form values', () => {
    const { getByText } = setup({ onClose: jest.fn(), selected: [], onSuccess: jest.fn() });

    fireEvent.click(getByText('Move'));

    expect(screen.getByText('Media Library')).toBeInTheDocument();
  });

  test('set default form values with currentFolder', () => {
    const FIXTURE_PARENT_FOLDER = {
      id: 2,
      name: 'default folder name',
      updatedAt: '2022-06-21T15:35:36.932Z',
      createdAt: '2022-06-21T07:04:49.813Z',
      parent: null,
      path: '/2',
      pathId: 2,
    };
    const { getByText } = setup({
      currentFolder: FIXTURE_PARENT_FOLDER,
      onClose: jest.fn(),
      selected: [],
      onSuccess: jest.fn(),
    });

    fireEvent.click(getByText('Move'));

    expect(screen.getByText(FIXTURE_PARENT_FOLDER.name)).toBeInTheDocument();
  });

  test('keeps destination dialog open if the API call errored', async () => {
    const FIXTURE_ERROR_MESSAGE = 'Failed to move folder';

    const onSuccessSpy = jest.fn();
    const { getByText } = setup({
      onSuccess: onSuccessSpy,
      selected: FIXTURE_SELECTION,
    });
    const moveSpy = jest.fn().mockRejectedValueOnce({
      response: {
        data: {
          error: {
            name: 'ValidationError',
            details: {
              errors: [
                {
                  path: [],
                  message: FIXTURE_ERROR_MESSAGE,
                  name: 'ValidationError',
                },
              ],
            },
          },
        },
      },
    });

    useBulkMove.mockReturnValueOnce({
      isLoading: false,
      error: null,
      move: moveSpy,
    });

    act(() => {
      fireEvent.click(getByText('Move'));
    });

    expect(getByText('Move elements to')).toBeInTheDocument();

    act(() => {
      const dialog = screen.getByRole('dialog');
      const submit = within(dialog).getByRole('button', {
        name: /move/i,
      });
      fireEvent.click(submit);
    });

    await waitFor(() => expect(moveSpy).toBeCalledWith('', FIXTURE_SELECTION));

    await waitFor(() => expect(onSuccessSpy).not.toBeCalled());
    expect(getByText('Move elements to')).toBeInTheDocument();
    expect(getByText(FIXTURE_ERROR_MESSAGE)).toBeInTheDocument();
  });
});
