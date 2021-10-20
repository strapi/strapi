/* eslint-disable react/prop-types */

import React from 'react';
import { createStore } from 'redux';
import { combineReducers } from 'redux-immutable';
import { fromJS } from 'immutable';

import { Provider } from 'react-redux';
import { request, useUserPermissions } from 'strapi-helper-plugin';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from 'react-query';
import LocaleSettingsPage from '..';
import themes from '../../../../../../strapi-admin/admin/src/themes';
import i18nReducers, { initialState } from '../../../hooks/reducers';

const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient();

  const initialStoreState = fromJS(initialState);
  const rootReducer = combineReducers(i18nReducers);
  const store = createStore(rootReducer, initialStoreState);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={themes}>{children}</ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

// TODO: we should not be forced to mock this module
// but it bugs somehow when run with jest
jest.mock('strapi-helper-plugin', () => ({
  EmptyState: ({ title, description }) => (
    <div data-testid="empty-list">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
  BaselineAlignment: () => <div />,
  ModalConfirm: ({ onConfirm, isOpen }) =>
    isOpen ? (
      <div role="dialog">
        <button onClick={onConfirm} type="button">
          Confirm
        </button>
      </div>
    ) : null,

  Modal: ({ isOpen, children }) => isOpen && <div role="dialog">{children}</div>,
  ModalHeader: ({ children }) => <div>{children}</div>,
  ModalSection: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
  HeaderModal: ({ children }) => <div>{children}</div>,
  HeaderModalTitle: ({ children }) => <div>{children}</div>,
  ModalForm: ({ children }) => <div>{children}</div>,
  ListButton: () => <div />,
  Tabs: ({ children }) => <div>{children}</div>,
  TabsNav: ({ children }) => <div>{children}</div>,
  Tab: ({ children }) => <div>{children}</div>,
  TabsPanel: ({ children }) => <div>{children}</div>,
  TabPanel: ({ children }) => <div>{children}</div>,
  useUserPermissions: jest.fn(),
  request: jest.fn(),
  selectStyles: () => ({ control: () => ({}), indicatorsContainer: () => ({}) }),
  useGlobalContext: () => ({ updateMenu: jest.fn() }),
  useUser: () => ({ fetchUserPermissions: jest.fn() }),
}));

jest.mock('../../../utils', () => ({
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ id }) => id,
  }),
}));

describe('i18n settings page', () => {
  beforeEach(() => {
    request.mockImplementation(() =>
      Promise.resolve([
        {
          id: 1,
          name: 'French',
          code: 'fr-FR',
          isDefault: false,
        },
        {
          id: 2,
          name: 'English',
          code: 'en-US',
          isDefault: true,
        },
      ])
    );

    useUserPermissions.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canRead: true, canUpdate: true, canCreate: true, canDelete: true },
    }));

    strapi.notification.toggle = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initial state', () => {
    it('shows default EN locale with edit button but no delete button', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      expect(rowUtils.queryByLabelText('Settings.list.actions.delete')).toBeFalsy();
      expect(rowUtils.getByLabelText('Settings.list.actions.edit')).toBeVisible();
      expect(rowUtils.getByText('Settings.locales.row.default-locale')).toBeVisible();
      expect(rowUtils.getByText('en-US')).toBeVisible();
    });

    it('shows FR locale with edit button and delete button', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('French').closest('tr'));
      const rowUtils = within(row);

      expect(rowUtils.getByLabelText('Settings.list.actions.delete')).toBeVisible();
      expect(rowUtils.getByLabelText('Settings.list.actions.edit')).toBeVisible();
      expect(rowUtils.getByText('fr-FR')).toBeVisible();
    });
  });

  describe('delete', () => {
    it('removes the locale when clicking the confirmation button', async () => {
      request.mockImplementation((_, opts) =>
        opts.method === 'DELETE'
          ? Promise.resolve({ id: 1 })
          : Promise.resolve([
              {
                id: 1,
                name: 'French',
                code: 'fr-FR',
                isDefault: false,
              },
              {
                id: 2,
                name: 'English',
                code: 'en-US',
                isDefault: true,
              },
            ])
      );

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('French').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.delete'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'success',
          message: { id: 'Settings.locales.modal.delete.success' },
        })
      );
    });

    it('shows an error when something went wrong when deleting', async () => {
      request.mockImplementation((_, opts) =>
        opts.method === 'DELETE'
          ? Promise.reject(new Error('An error'))
          : Promise.resolve([
              {
                id: 1,
                name: 'French',
                code: 'fr-FR',
                isDefault: false,
              },
              {
                id: 2,
                name: 'English',
                code: 'en-US',
                isDefault: true,
              },
            ])
      );

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('French').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.delete'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'warning',
          message: { id: 'notification.error' },
        })
      );
    });
  });

  describe('edit', () => {
    it('shows the default edit modal layout with disabled value', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.edit'));

      expect(screen.getByText(`Settings.locales.modal.edit.confirmation`)).toBeVisible();
      expect(screen.getByLabelText(`Settings.locales.modal.edit.locales.label`)).toBeDisabled();
    });

    it('shows a warning and disabled the confirmation button when display name length is over 50', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.edit'));
      fireEvent.change(screen.getByLabelText('Settings.locales.modal.locales.displayName'), {
        target: {
          value:
            'a very very very very long string that has more than fifty characters in order to show a warning',
        },
      });
      fireEvent.blur(screen.getByLabelText('Settings.locales.modal.locales.displayName'));

      await waitFor(() =>
        expect(screen.getByText('Settings.locales.modal.edit.confirmation')).toBeDisabled()
      );
      expect(screen.getByText(`Settings.locales.modal.locales.displayName.error`)).toBeVisible();
    });

    it('closes the edit modal when clicking on cancel', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.edit'));
      fireEvent.click(screen.getByText('app.components.Button.cancel'));

      expect(screen.queryByText(`Settings.list.actions.edit`)).toBeFalsy();
    });

    it('shows an error when something went wrong when editing', async () => {
      const requestGetResponse = [
        {
          id: 1,
          name: 'French',
          code: 'fr-FR',
          isDefault: false,
        },
        {
          id: 2,
          name: 'English',
          code: 'en-US',
          isDefault: true,
        },
      ];

      request.mockImplementation((_, opts) =>
        opts.method === 'PUT'
          ? Promise.reject(new Error('Something wrong occured'))
          : Promise.resolve(requestGetResponse)
      );

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.edit'));
      fireEvent.click(screen.getByText('Settings.locales.modal.edit.confirmation'));

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'warning',
          message: { id: 'notification.error' },
        })
      );
    });

    it('shows a success message when editing succeeds', async () => {
      const requestGetResponse = [
        {
          id: 1,
          name: 'French',
          code: 'fr-FR',
          isDefault: false,
        },
        {
          id: 2,
          name: 'English',
          code: 'en-US',
          isDefault: true,
        },
      ];

      request.mockImplementation((_, opts) =>
        opts.method === 'PUT'
          ? Promise.resolve({
              id: 2,
              name: 'Frenchie',
              code: 'fr-FR',
              isDefault: false,
            })
          : Promise.resolve(requestGetResponse)
      );

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.edit'));
      fireEvent.click(screen.getByText('Settings.locales.modal.edit.confirmation'));

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'success',
          message: { id: 'Settings.locales.modal.edit.success' },
        })
      );

      expect(request).toBeCalledWith('/i18n/locales/2', {
        method: 'PUT',
        body: { name: 'English', isDefault: true },
      });
    });

    it('shows edits the locale with code as displayName when displayName is empty', async () => {
      const requestGetResponse = [
        {
          id: 1,
          name: 'French',
          code: 'fr-FR',
          isDefault: false,
        },
        {
          id: 2,
          name: 'English',
          code: 'en-US',
          isDefault: true,
        },
      ];

      request.mockImplementation((_, opts) =>
        opts.method === 'PUT'
          ? Promise.resolve({
              id: 2,
              name: 'Frenchie',
              code: 'fr-FR',
              isDefault: false,
            })
          : Promise.resolve(requestGetResponse)
      );

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Settings.list.actions.edit'));

      fireEvent.change(screen.getByLabelText('Settings.locales.modal.locales.displayName'), {
        target: {
          value: '',
        },
      });

      fireEvent.click(screen.getByText('Settings.locales.modal.edit.confirmation'));

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'success',
          message: { id: 'Settings.locales.modal.edit.success' },
        })
      );

      expect(request).toBeCalledWith('/i18n/locales/2', {
        method: 'PUT',
        body: { name: 'en-US', isDefault: true },
      });
    });
  });

  describe('retrieve', () => {
    it('shows an error when something went wrong when fetching', async () => {
      request.mockImplementation(() =>
        Promise.reject(new Error('Something went wrong on the server'))
      );

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'warning',
          message: { id: 'notification.error' },
        })
      );
    });

    it('shows an empty state when the array of locale is empty', async () => {
      request.mockImplementation(() => Promise.resolve([]));

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => expect(screen.getByTestId('empty-list')).toBeVisible());
    });
  });

  describe('permissions', () => {
    it('shows a loading information when resolving the permissions', () => {
      useUserPermissions.mockImplementation(() => ({
        isLoading: true,
        allowedActions: { canRead: false, canUpdate: true, canCreate: true, canDelete: true },
      }));

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      expect(screen.getByText(`Settings.permissions.loading`));
    });

    it("shows nothing when the user doesn't have read permission", () => {
      const canRead = false;

      useUserPermissions.mockImplementation(() => ({
        isLoading: false,
        allowedActions: { canRead, canUpdate: true, canCreate: true, canDelete: true },
      }));

      const { container } = render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      expect(container).toMatchSnapshot();
    });

    it('hides "Add locale" buttons when the user is not allowed to create a locale', async () => {
      const canCreate = false;

      request.mockImplementation(() => Promise.resolve([]));
      useUserPermissions.mockImplementation(() => ({
        isLoading: false,
        allowedActions: { canRead: true, canUpdate: true, canCreate, canDelete: true },
      }));

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      await waitFor(() =>
        expect(screen.queryAllByText(`Settings.list.actions.add`).length).toBe(0)
      );
    });

    it('hides the "Edit locale" button (pencil) when the user is not allowed to update a locale', async () => {
      const canUpdate = false;

      useUserPermissions.mockImplementation(() => ({
        isLoading: false,
        allowedActions: { canRead: true, canUpdate, canCreate: true, canDelete: true },
      }));

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => expect(screen.getByText('English')).toBeVisible());
      expect(screen.queryAllByLabelText(`Settings.list.actions.edit`).length).toBe(0);
    });

    it('hides the "Delete locale" button (garbage) when the user is not allowed to delete a locale', async () => {
      const canDelete = false;

      useUserPermissions.mockImplementation(() => ({
        isLoading: false,
        allowedActions: { canRead: true, canUpdate: false, canCreate: true, canDelete },
      }));

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => expect(screen.getByText('English')).toBeVisible());
      expect(screen.queryAllByLabelText(`Settings.list.actions.delete`).length).toBe(0);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      request.mockImplementation(url =>
        url.includes('/i18n/locales')
          ? Promise.resolve([])
          : Promise.resolve([
              { code: 'fr-FR', name: 'Francais' },
              { code: 'en-EN', name: 'English' },
            ])
      );
    });

    it('shows the default create modal layout', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Settings.list.actions.add'));

      expect(
        screen.getByText(`Settings.locales.modal.create.defaultLocales.loading`)
      ).toBeVisible();

      await waitFor(() =>
        expect(screen.getByText(`Settings.locales.modal.create.confirmation`)).toBeVisible()
      );

      expect(screen.getByText(`fr-FR`)).toBeVisible();
      expect(screen.getByLabelText('Settings.locales.modal.locales.displayName')).toHaveValue(
        'Francais'
      );
    });

    it('closes the create modal when clicking on cancel', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Settings.list.actions.add'));

      await waitFor(() =>
        expect(screen.getByText(`Settings.locales.modal.create.confirmation`)).toBeVisible()
      );

      fireEvent.click(screen.getByText('app.components.Button.cancel'));

      expect(screen.queryByText(`Settings.locales.modal.create.confirmation`)).toBeFalsy();
    });

    it('shows a warning and disabled the confirmation button when display name length is over 50', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Settings.list.actions.add'));

      await waitFor(() =>
        expect(screen.getByText(`Settings.locales.modal.create.confirmation`)).toBeVisible()
      );

      fireEvent.change(screen.getByLabelText('Settings.locales.modal.locales.displayName'), {
        target: {
          value:
            'a very very very very long string that has more than fifty characters in order to show a warning',
        },
      });

      fireEvent.blur(screen.getByLabelText('Settings.locales.modal.locales.displayName'));

      await waitFor(() =>
        expect(screen.getByText(`Settings.locales.modal.locales.displayName.error`)).toBeVisible()
      );
    });

    it('sync the select and the text input', async () => {
      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Settings.list.actions.add'));

      await waitFor(() =>
        expect(screen.getByText(`Settings.locales.modal.create.confirmation`)).toBeVisible()
      );

      // Put some data in the input in order to make sure it resets well when changing locale
      fireEvent.change(screen.getByLabelText('Settings.locales.modal.locales.displayName'), {
        target: {
          value:
            'a very very very very long string that has more than fifty characters in order to show a warning',
        },
      });

      const DOWN_ARROW = { keyCode: 40 };
      fireEvent.keyDown(screen.getByLabelText('Settings.locales.modal.locales.label'), DOWN_ARROW);

      fireEvent.click(screen.getByText('en-EN'));

      expect(screen.getByLabelText('Settings.locales.modal.locales.displayName')).toHaveValue(
        'English'
      );
    });

    it('shows an error when something went wrong when adding a locale', async () => {
      request.mockImplementation((url, opts) => {
        if (opts.method === 'POST') {
          return Promise.reject(new Error('Something went wrong when adding a locale'));
        }
        if (url.includes('/i18n/locales')) return Promise.resolve([]);

        return Promise.resolve([
          { code: 'fr-FR', name: 'Francais' },
          { code: 'en-EN', name: 'English' },
        ]);
      });

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Settings.list.actions.add'));

      const confirmationButton = await waitFor(() =>
        screen.getByText(`Settings.locales.modal.create.confirmation`)
      );

      fireEvent.click(confirmationButton);

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'warning',
          message: { id: 'notification.error' },
        })
      );
    });

    it('shows an success toast when adding a locale is successful', async () => {
      request.mockImplementation((url, opts) => {
        if (opts.method === 'POST') {
          return Promise.resolve({ id: 3, code: 'en-CA', name: 'Canadien' });
        }
        if (url.includes('/i18n/locales')) return Promise.resolve([]);

        return Promise.resolve([
          { code: 'fr-FR', name: 'Francais' },
          { code: 'en-EN', name: 'English' },
        ]);
      });

      render(
        <TestWrapper>
          <LocaleSettingsPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Settings.list.actions.add'));

      const confirmationButton = await waitFor(() =>
        screen.getByText(`Settings.locales.modal.create.confirmation`)
      );

      fireEvent.click(confirmationButton);

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'success',
          message: { id: 'Settings.locales.modal.create.success' },
        })
      );
    });
  });
});
