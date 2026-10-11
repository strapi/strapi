import { configureStore } from '@reduxjs/toolkit';
import { NotificationsProvider, adminApi } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import {
  within,
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import { useEditFolder } from '../../../hooks/useEditFolder';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { EditFolderDialog, EditFolderDialogProps } from '../EditFolderDialog';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    put: jest.fn().mockImplementation(() => {}),
  }),
}));

jest.mock('../../../hooks/useMediaLibraryPermissions');
jest.mock('../../../hooks/useFolderStructure');
jest.mock('../../../hooks/useEditFolder');

jest.spyOn(global.console, 'warn').mockImplementation(() => jest.fn());

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const store = configureStore({
  reducer: { [adminApi.reducerPath]: adminApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(adminApi.middleware),
});

const ComponentFixture = (
  props: Omit<EditFolderDialogProps, 'open' | 'onClose'> & {
    folderStructure?: {
      value?: number;
      label?: string;
      name?: string;
    }[];
  }
) => {
  const nextProps = {
    canUpdate: true,
    ...props,
  };

  return (
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <IntlProvider locale="en" messages={{}}>
          <DesignSystemProvider>
            <NotificationsProvider>
              <EditFolderDialog open onClose={() => {}} {...nextProps} />
            </NotificationsProvider>
          </DesignSystemProvider>
        </IntlProvider>
      </QueryClientProvider>
    </Provider>
  );
};

function setup(
  props?: Partial<EditFolderDialogProps> & {
    folderStructure?: {
      value?: number;
      label?: string;
      name?: string;
    }[];
  }
) {
  return render(<ComponentFixture {...props} />);
}

function getInput(container: HTMLElement, name: string) {
  return container.querySelector(`input[name="${name}"]`);
}

function getButton(container: HTMLElement, name: string) {
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

    fireEvent.click(getButton(baseElement, 'cancel')!);

    expect(spy).toBeCalledTimes(1);
  });

  test('name is a required field', async () => {
    const spy = jest.fn();
    const { baseElement } = setup({ onClose: spy });
    const name = getInput(baseElement, 'name');

    fireEvent.click(getButton(baseElement, 'submit')!);

    expect(spy).toBeCalledTimes(0);

    fireEvent.change(name!, { target: { value: 'folder name' } });

    fireEvent.click(getButton(baseElement, 'submit')!);

    await waitFor(() => expect(spy).toBeCalledTimes(1));

    expect(spy).toBeCalledWith({ created: true });

    // Wait for notification to prevent act warnings from Sonner
    await screen.findByText('Folder successfully created');
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
      type: 'folder',
    };
    const { baseElement, getByText } = setup({ folder, onClose: spy });

    expect((getInput(baseElement, 'name')! as HTMLInputElement).value).toBe(folder.name);
    expect(getByText('Media Library')).toBeInTheDocument();
  });

  test('set default form values with parentFolderId', async () => {
    const spy = jest.fn();
    const { getByText } = setup({ parentFolderId: 2, onClose: spy });

    expect(getByText('second child')).toBeInTheDocument();
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
      type: 'folder',
    };
    const folderStructure = [{ value: 1, label: 'Some parent' }];
    const { baseElement, getByText } = setup({ folder, folderStructure });

    fireEvent.click(getButton(baseElement, 'delete')!);

    expect(getByText('Are you sure?')).toBeInTheDocument();
  });

  test('keeps edit folder dialog open and show error message on API error', async () => {
    const FIXTURE_ERROR_MESSAGE = 'folder cannot be moved inside itself';
    const moveSpy = jest.fn().mockRejectedValueOnce({
      response: {
        data: {
          error: {
            name: 'ValidationError',
            details: {
              errors: [
                {
                  path: ['parent'],
                  message: FIXTURE_ERROR_MESSAGE,
                  name: 'ValidationError',
                },
              ],
            },
          },
        },
      },
    });
    (useEditFolder as jest.Mock).mockReturnValueOnce({
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
      type: 'folder',
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
    (useMediaLibraryPermissions as jest.Mock).mockReturnValueOnce({ canUpdate: false });
    const { getByRole } = setup();

    expect(getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-disabled', 'true');
    expect(getByRole('combobox', { name: 'Location' })).toBeDisabled();

    expect(getByRole('button', { name: 'Create' })).toBeDisabled();
  });
  describe.each(['create', 'rename'])('%s keyboard handling', (mode) => {
    const folder =
      mode === 'rename'
        ? {
            id: 7,
            name: 'Existing',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            pathId: 7,
            path: '7',
            parent: null,
            type: 'folder',
          }
        : undefined;

    function setupKeyboard() {
      const editFolder = jest.fn().mockResolvedValue({});
      (useEditFolder as jest.Mock).mockReturnValue({ editFolder, isLoading: false });
      const onClose = jest.fn();
      const { baseElement } = setup({ folder, onClose });
      const name = getInput(baseElement, 'name')!;
      fireEvent.change(name, { target: { value: '日本語' } });
      return { editFolder, onClose, name, baseElement };
    }

    test('keeps the name and dialog open for IME confirmation, then submits once on Enter', async () => {
      const { editFolder, onClose, name } = setupKeyboard();
      const confirmation = createEvent.keyDown(name, {
        key: 'Enter',
        keyCode: 229,
        isComposing: true,
      });

      fireEvent(name, confirmation);

      expect(confirmation.defaultPrevented).toBe(false);
      expect(editFolder).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(name).toHaveValue('日本語');
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const ordinaryEnter = createEvent.keyDown(name, {
        key: 'Enter',
        keyCode: 13,
        isComposing: false,
      });
      fireEvent(name, ordinaryEnter);
      expect(ordinaryEnter.defaultPrevented).toBe(true);
      await waitFor(() => expect(editFolder).toHaveBeenCalledTimes(1));
      expect(editFolder).toHaveBeenCalledWith({ name: '日本語', parent: null }, folder?.id);
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    test('preserves Shift+Enter submission', async () => {
      const { editFolder, onClose, name } = setupKeyboard();
      const shiftEnter = createEvent.keyDown(name, { key: 'Enter', keyCode: 13, shiftKey: true });
      fireEvent(name, shiftEnter);
      expect(shiftEnter.defaultPrevented).toBe(true);
      await waitFor(() => expect(editFolder).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    test('does not save on blur or cancel', async () => {
      const { editFolder, onClose, name, baseElement } = setupKeyboard();
      fireEvent.blur(name);
      expect(editFolder).not.toHaveBeenCalled();
      fireEvent.click(getButton(baseElement, 'cancel')!);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(editFolder).not.toHaveBeenCalled();
    });

    test('closes without saving on Escape', async () => {
      const { editFolder, onClose, name } = setupKeyboard();
      act(() => {
        (name as HTMLInputElement).focus();
      });
      fireEvent.keyDown(name, { key: 'Escape', keyCode: 27 });
      expect(editFolder).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
