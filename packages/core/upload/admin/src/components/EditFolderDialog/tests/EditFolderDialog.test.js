import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { QueryClientProvider, QueryClient } from 'react-query';

import { EditFolderDialog } from '../EditFolderDialog';
import { useEditFolder } from '../../../hooks/useEditFolder';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';

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
            <EditFolderDialog onClose={() => {}} {...nextProps} />
          </NotificationsProvider>
        </ThemeProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

function setup(props = { onClose: jest.fn() }) {
  return render(<ComponentFixture {...props} />);
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
    const { baseElement } = setup();
    expect(baseElement).toMatchSnapshot();
  });

  test('closes the modal', () => {
    const spy = jest.fn();
    const { baseElement } = setup({ onClose: spy });

    act(() => {
      fireEvent.click(getButton(baseElement, 'cancel'));
    });

    expect(spy).toBeCalledTimes(1);
  });

  test('name is a required field', async () => {
    const spy = jest.fn();
    const { baseElement } = setup({ onClose: spy });
    const name = getInput(baseElement, 'name');

    act(() => {
      fireEvent.click(getButton(baseElement, 'submit'));
    });

    expect(spy).toBeCalledTimes(0);

    act(() => {
      fireEvent.change(name, { target: { value: 'folder name' } });
    });

    act(() => {
      fireEvent.click(getButton(baseElement, 'submit'));
    });

    await waitFor(() => expect(spy).toBeCalledTimes(1));

    expect(spy).toBeCalledWith({ created: true });
  });

  test('set default form values', async () => {
    const spy = jest.fn();
    const folder = {
      id: 2,
      name: 'default folder name',
      createdAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
      updatedAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
      pathId: 2,
      path: '2',
      parent: null,
    };
    const { baseElement, queryByText } = setup({ folder, onClose: spy });

    expect(getInput(baseElement, 'name').value).toBe(folder.name);
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
      createdAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
      updatedAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
      children: { count: 0 },
      parent: {
        id: 2,
        name: 'Some parent',
        createdAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
        updatedAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
        pathId: 2,
        path: '1/2',
      },
      pathId: 2,
      path: '2',
    };
    const folderStructure = [{ value: 1, label: 'Some parent' }];
    const { baseElement, queryByText } = setup({ folder, folderStructure });

    act(() => {
      fireEvent.click(getButton(baseElement, 'delete'));
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
      children: { count: 0 },
      createdAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
      updatedAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
      parent: {
        id: 2,
        name: 'Some parent',
        createdAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
        updatedAt: 'Mon Oct 24 2022 16:02:14 GMT+0200',
        pathId: 2,
        path: '1/2',
      },
      pathId: 2,
      path: '2',
    };
    const folderStructure = [{ value: 1, name: 'Some parent' }];

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

  test('disables inputs and submit action if users do not have permissions to update', () => {
    useMediaLibraryPermissions.mockReturnValueOnce({ canUpdate: false });
    const { getByRole } = setup();

    expect(getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-disabled', 'true');
    expect(getByRole('combobox', { name: 'Location' })).toBeDisabled();

    expect(getByRole('button', { name: 'Create' })).toBeDisabled();
  });
});
