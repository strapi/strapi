import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
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

const FIXTURE_FOLDER_STRUCTURE = [
  {
    value: null,
    label: 'Media Library',
    children: [],
  },
];

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
    folderStructure: FIXTURE_FOLDER_STRUCTURE,
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
      id: 1,
      name: 'default folder name',
      children: [],
      parent: { id: 1, label: 'Some parent' },
    };
    const folderStructure = [{ value: 1, label: 'Some parent' }];
    const { container } = setup({ folder, folderStructure, onClose: spy });

    act(() => {
      fireEvent.click(getButton(container, 'submit'));
    });

    expect(getInput(container, 'name').value).toBe(folder.name);
    expect(screen.getByText('Some parent')).toBeInTheDocument();
  });

  test('show confirmation delete dialog', async () => {
    const folder = {
      id: 1,
      name: 'default folder name',
      children: [],
      parent: { id: 1, label: 'Some parent' },
    };
    const folderStructure = [{ value: 1, label: 'Some parent' }];
    const { container } = setup({ folder, folderStructure });

    act(() => {
      fireEvent.click(getButton(container, 'delete'));
    });

    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });
});
