import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { QueryClientProvider, QueryClient } from 'react-query';

import { EditFolderDialog } from '../EditFolderDialog';
import { useEditFolder } from '../../../hooks/useEditFolder';

console.error = jest.fn();

jest.mock('../../../utils/axiosInstance', () => ({
  ...jest.requireActual('../../../utils/axiosInstance'),
  put: jest.fn().mockImplementation({}),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: jest.fn().mockReturnValue([{ query: {} }]),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

jest.mock('../../../hooks/useMediaLibraryPermissions');
jest.mock('../../../hooks/useFolderStructure');
jest.mock('../../../hooks/useEditFolder');

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function ComponentFixture(props) {
  const nextProps = {
    canUpdate: true,
    ...props,
  };

  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <NotificationsProvider toggleNotification={() => {}}>
            <EditFolderDialog {...nextProps} />
          </NotificationsProvider>
        </ThemeProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

function setup(props = { onClose: jest.fn() }) {
  return render(<ComponentFixture {...props} />, { container: document.body });
}

function getInput(container, name) {
  return container.querySelector(`input[name="${name}"]`);
}

function getButton(container, name) {
  return container.querySelector(`button[name="${name}"]`);
}

describe('EditFolderDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders and matches the snapshot', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });

  test('closes the modal', () => {
    const spy = jest.fn();
    const { container } = setup({ onClose: spy });

    act(() => {
      fireEvent.click(getButton(container, 'cancel'));
    });

    expect(spy).toBeCalledTimes(1);
  });

  test('name is a required field', async () => {
    const spy = jest.fn();
    const { container } = setup({ onClose: spy });
    const name = getInput(container, 'name');

    act(() => {
      fireEvent.click(getButton(container, 'submit'));
    });

    expect(spy).toBeCalledTimes(0);

    act(() => {
      fireEvent.change(name, { target: { value: 'folder name' } });
    });

    act(() => {
      fireEvent.click(getButton(container, 'submit'));
    });

    await waitFor(() => expect(spy).toBeCalledTimes(1));

    expect(spy).toBeCalledWith({ created: true });
  });

  test('set default form values', async () => {
    const spy = jest.fn();
    const folder = {
      id: 2,
      name: 'default folder name',
    };
    const { container, queryByText } = setup({ folder, onClose: spy });

    expect(getInput(container, 'name').value).toBe(folder.name);
    expect(queryByText('Media Library')).toBeInTheDocument();
  });

  test('set default form values with parentFolderId', async () => {
    const spy = jest.fn();
    const { queryByText } = setup({ parentFolderId: 2, onClose: spy });

    expect(queryByText('second child')).toBeInTheDocument();
  });

  test('show confirmation delete dialog', async () => {
    const folder = {
      id: 1,
      name: 'default folder name',
      children: [],
      parent: { id: 1, label: 'Some parent' },
    };
    const folderStructure = [{ value: 1, label: 'Some parent' }];
    const { container, queryByText } = setup({ folder, folderStructure });

    act(() => {
      fireEvent.click(getButton(container, 'delete'));
    });

    expect(queryByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  test('keeps edit folder dialog open and show error message on API error', async () => {
    const FIXTURE_ERROR_MESSAGE = 'folder cannot be moved inside itself';
    const moveSpy = jest.fn().mockRejectedValueOnce({
      response: {
        data: {
          error: {
            details: {
              errors: [
                {
                  path: ['parent'],
                  message: FIXTURE_ERROR_MESSAGE,
                },
              ],
            },
          },
        },
      },
    });
    useEditFolder.mockReturnValueOnce({
      isLoading: false,
      editFolder: moveSpy,
    });

    const folder = {
      id: 1,
      name: 'default folder name',
      children: [],
      parent: { id: 1, label: 'Some parent' },
    };
    const folderStructure = [{ value: 1, label: 'Some parent' }];

    const { getByText } = setup({ folder, folderStructure });

    const dialog = screen.getByRole('dialog');
    const submit = within(dialog).getByRole('button', {
      name: /save/i,
    });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(moveSpy).toBeCalledWith({ name: 'default folder name', parent: null }, 1)
    );

    expect(getByText(FIXTURE_ERROR_MESSAGE)).toBeInTheDocument();
  });
});
