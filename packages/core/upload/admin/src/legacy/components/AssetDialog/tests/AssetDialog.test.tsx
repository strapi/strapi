import { configureStore } from '@reduxjs/toolkit';
import { adminApi, NotificationsProvider } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render as renderTL, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { useAssets } from '../../../hooks/useAssets';
import { useFolders } from '../../../hooks/useFolders';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useModalQueryParams } from '../../../hooks/useModalQueryParams';
import { AssetDialog } from '../AssetDialog';

jest.mock('../../../hooks/useMediaLibraryPermissions');
jest.mock('../../../hooks/useFolders');
jest.mock('../../../hooks/useAssets');
jest.mock('../../../hooks/useModalQueryParams');
jest.mock('../../../hooks/useFolderStructure');
/**
 * Mock the cropper import to avoid having an error
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const store = configureStore({
  reducer: { [adminApi.reducerPath]: adminApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(adminApi.middleware),
});

const renderML = (
  props = {
    onClose: jest.fn(),
    onAddAsset: jest.fn(),
    onAddFolder: jest.fn(),
    onChangeFolder: jest.fn(),
    onValidate: jest.fn(),
    multiple: false,
    initiallySelectedAssets: [],
  }
) =>
  renderTL(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <DesignSystemProvider>
          <MemoryRouter>
            <IntlProvider locale="en" messages={{}}>
              <NotificationsProvider>
                <AssetDialog open {...props} />
              </NotificationsProvider>
            </IntlProvider>
          </MemoryRouter>
        </DesignSystemProvider>
      </QueryClientProvider>
    </Provider>
  );

describe('AssetDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      (useMediaLibraryPermissions as jest.Mock).mockReturnValueOnce({ isLoading: true });

      renderML();

      expect(screen.getByText('Content is loading.')).toBeInTheDocument();
    });

    it('shows a loader when resolving assets', () => {
      (useAssets as jest.Mock).mockReturnValueOnce({
        isLoading: true,
        error: null,
        data: { pagination: {}, results: [] },
      });

      renderML();

      expect(screen.getByText('Content is loading.')).toBeInTheDocument();
    });

    it('shows a loader when resolving folders', () => {
      (useFolders as jest.Mock).mockReturnValueOnce({ isLoading: true, error: null, data: null });

      renderML();

      expect(screen.getByText('Content is loading.')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    describe('empty state', () => {
      it('shows a specific empty state when the user is not allowed to see the content', () => {
        (useMediaLibraryPermissions as jest.Mock).mockReturnValueOnce({
          isLoading: false,
          canRead: false,
        });

        renderML();

        expect(
          screen.getByText("You don't have the permissions to access that content")
        ).toBeInTheDocument();

        expect(screen.queryByText('Folders')).not.toBeInTheDocument();
        expect(screen.queryByText('Assets')).not.toBeInTheDocument();

        expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-busy');
      });
    });

    describe('error state', () => {
      it('shows when loading assets threw an error', () => {
        (useAssets as jest.Mock).mockReturnValueOnce({ isLoading: false, error: true });

        renderML();

        expect(
          screen.getByText('Whoops! Something went wrong. Please, try again.')
        ).toBeInTheDocument();
      });

      it('shows when loading folders threw an error', () => {
        (useAssets as jest.Mock).mockReturnValueOnce({ isLoading: false, error: true });

        renderML();

        expect(
          screen.getByText('Whoops! Something went wrong. Please, try again.')
        ).toBeInTheDocument();
      });
    });

    describe('content', () => {
      it('shows assets when the data resolves', async () => {
        renderML();

        expect(screen.getByText('3874873.jpg')).toBeInTheDocument();
      });

      it('shows folders when the data resolves', async () => {
        renderML();

        expect(screen.getByText('Folder 1')).toBeInTheDocument();
      });

      it('does not display folders, if the current page !== 1', () => {
        (useAssets as jest.Mock).mockReturnValueOnce({
          isLoading: false,
          error: null,
          data: { pagination: { page: 2 } },
        });

        expect(screen.queryByText('Folder 1')).not.toBeInTheDocument();
      });

      it('does not display folders, if the mime-type filter was applied', () => {
        (useModalQueryParams as jest.Mock).mockReturnValueOnce([
          {
            queryObject: {
              page: 1,
              sort: 'updatedAt:DESC',
              pageSize: 10,
              filters: {
                $and: [
                  {
                    mime: true,
                  },
                ],
              },
            },
          },
          {
            onChangeFilters: jest.fn(),
            onChangePage: jest.fn(),
            onChangePageSize: jest.fn(),
            onChangeSort: jest.fn(),
            onChangeSearch: jest.fn(),
            onChangeFolder: jest.fn(),
          },
        ]);

        expect(screen.queryByText('Folder 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('unsaved changes', () => {
    const defaultProps = {
      onClose: jest.fn(),
      onAddAsset: jest.fn(),
      onAddFolder: jest.fn(),
      onChangeFolder: jest.fn(),
      onValidate: jest.fn(),
      multiple: false,
      initiallySelectedAssets: [],
      allowedTypes: ['images', 'files', 'videos', 'audios'],
    };

    beforeEach(() => {
      // Earlier tests queue `mockReturnValueOnce` values without rendering, which would leak here.
      const assetsDefaults = jest.requireActual('../../../hooks/__mocks__/useAssets').useAssets();
      const queryParamsDefaults = jest.requireActual(
        '../../../hooks/__mocks__/useModalQueryParams'
      );
      (useAssets as jest.Mock).mockReset().mockReturnValue({
        ...assetsDefaults,
        data: {
          ...assetsDefaults.data,
          // An empty string keeps the edit form's input controlled.
          results: assetsDefaults.data.results.map((asset: object) => ({
            ...asset,
            alternativeText: '',
          })),
        },
      });
      (useModalQueryParams as jest.Mock)
        .mockReset()
        .mockReturnValue(queryParamsDefaults.useModalQueryParams());
    });

    it('asks for confirmation on Escape when the asset being edited has changed', async () => {
      renderML(defaultProps);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      const input = await screen.findByRole('textbox', { name: /alternative text/i });
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(await screen.findByRole('alertdialog')).toHaveTextContent(
        'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.'
      );
      expect(defaultProps.onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes on Escape when the asset being edited has not changed', async () => {
      renderML(defaultProps);

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      const input = await screen.findByRole('textbox', { name: /alternative text/i });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('closes on Escape without asking when assets are selected', async () => {
      renderML(defaultProps);

      fireEvent.click(screen.getByRole('checkbox'));

      expect(
        within(screen.getByRole('tab', { name: /selected files/i })).getByText('1')
      ).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
