import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { QueryClientProvider, QueryClient } from 'react-query';

import { EditFolderDialog } from '../EditFolderDialog';

console.error = jest.fn();

jest.mock('../../../utils/axiosInstance', () => ({
  ...jest.requireActual('../../../utils/axiosInstance'),
  put: jest.fn().mockImplementation({}),
}));

jest.mock('../../../hooks/useEditFolder', () => ({
  ...jest.requireActual('../../../hooks/useEditFolder'),
  useEditFolder: jest.fn().mockReturnValue({
    editFolder: jest.fn().mockResolvedValue({}),
    isLoading: false,
  }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: jest.fn().mockReturnValue([{ query: {} }]),
}));

jest.mock('../../../hooks/useMediaLibraryPermissions', () => ({
  useMediaLibraryPermissions: jest.fn().mockReturnValue({
    isLoading: false,
    canCreate: true,
    canUpdate: true,
  }),
}));

jest.mock('../../../hooks/useFolderStructure', () => ({
  useFolderStructure: jest.fn().mockReturnValue({
    isLoading: false,
    error: null,
    data: [
      {
        value: null,
        label: 'Media Library',
        children: [
          {
            value: 1,
            label: 'first child',
            children: [],
          },

          {
            value: 2,
            label: 'second child',
            children: [
              {
                value: 21,
                name: 'first child of the second child',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  }),
}));

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

function setup(props) {
  const FIXTURE_PROPS = {
    onClose: jest.fn(),
    ...props,
  };

  return render(<ComponentFixture {...FIXTURE_PROPS} />, { container: document.body });
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
});
