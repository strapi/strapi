import React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { MediaLibrary } from '..';
import { viewOptions } from '../../../../constants';
import { useAssets } from '../../../../hooks/useAssets';
import { useFolder } from '../../../../hooks/useFolder';
import { useFolders } from '../../../../hooks/useFolders';
import { useMediaLibraryPermissions } from '../../../../hooks/useMediaLibraryPermissions';
import { usePersistentState } from '../../../../hooks/usePersistentState';
import { useSelectionState } from '../../../../hooks/useSelectionState';

const FIXTURE_ASSET_PAGINATION = {
  pageCount: 1,
  page: 1,
  pageSize: 10,
  total: 1,
};

const FIXTURE_ASSETS = [
  {
    id: 77,
    name: '3874873.jpg',
    alternativeText: null,
    caption: null,
    width: 400,
    height: 400,
    formats: {
      thumbnail: {
        name: 'thumbnail_3874873.jpg',
        hash: 'thumbnail_3874873_b5818bb250',
        ext: '.jpg',
        mime: 'image/jpeg',
        width: 156,
        height: 156,
        size: 3.97,
        path: null,
        url: '/uploads/thumbnail_3874873_b5818bb250.jpg',
      },
    },
    hash: '3874873_b5818bb250',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 11.79,
    url: '/uploads/3874873_b5818bb250.jpg',
    previewUrl: null,
    provider: 'local',
    provider_metadata: null,
    createdAt: '2021-10-18T08:04:56.326Z',
    updatedAt: '2021-10-18T08:04:56.326Z',
  },
];

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: jest.fn().mockReturnValue([{ rawQuery: '', query: {} }, jest.fn()]),
}));

jest.mock('../../../../hooks/useMediaLibraryPermissions');
jest.mock('../../../../hooks/useFolders');
jest.mock('../../../../hooks/useFolder');
jest.mock('../../../../hooks/useAssets');
jest.mock('../../../../hooks/useFolderStructure', () => ({
  useFolderStructure: jest
    .fn()
    .mockReturnValue({ data: [{ label: 'Folder 1', value: 1, children: [] }], isLoading: false }),
}));
jest.mock('../../../../hooks/useSelectionState', () => ({
  useSelectionState: jest
    .fn()
    .mockReturnValue([[], { selectOne: jest.fn(), selectAll: jest.fn() }]),
}));
jest.mock('../../../../hooks/usePersistentState', () => ({
  usePersistentState: jest.fn().mockReturnValue([0, jest.fn()]),
}));
const renderML = () => ({
  ...renderRTL(<MediaLibrary />, {
    wrapper({ children }) {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en" messages={{}}>
            <DesignSystemProvider>
              <MemoryRouter>{children}</MemoryRouter>
            </DesignSystemProvider>
          </IntlProvider>
        </QueryClientProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('Media library homepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        isLoading: true,
        canCreate: false,
        canRead: false,
      });
      const { getByRole, getByText } = renderML();
      expect(getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader while resolving assets', () => {
      useAssets.mockReturnValueOnce({ isLoading: true });
      const { getByRole, getByText } = renderML();
      expect(getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader while resolving folders', () => {
      useFolders.mockReturnValueOnce({ isLoading: true });
      const { getByRole, getByText } = renderML();
      expect(getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(getByText('Loading content.')).toBeInTheDocument();
    });
  });

  describe('general actions', () => {
    describe('filters', () => {
      it('shows the filters dropdown when the user is allowed to read', () => {
        const { getByText } = renderML();

        expect(getByText('Filters')).toBeInTheDocument();
      });

      it('hides the filters dropdown when the user is not allowed to read', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
          canCreate: false,
        });
        const { queryByText } = renderML();
        expect(queryByText('app.utils.filters')).not.toBeInTheDocument();
      });
    });

    describe('sort by', () => {
      it('shows the sort by dropdown when the user is allowed to read', () => {
        const { getByText } = renderML();
        expect(getByText('Sort by')).toBeInTheDocument();
      });

      it('hides the sort by dropdown when the user is not allowed to read', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
          canCreate: false,
        });
        const { queryByText } = renderML();
        expect(queryByText('Sort by')).not.toBeInTheDocument();
      });

      [
        'createdAt:DESC',
        'createdAt:ASC',
        'name:ASC',
        'name:DESC',
        'updatedAt:DESC',
        'updatedAt:ASC',
      ].forEach((sortKey) => {
        it(`modifies the URL with the according params: ${sortKey}`, async () => {
          const setQueryMock = jest.fn();
          useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: {} }, setQueryMock]);

          const { getByRole, getByText, user } = renderML();

          await user.click(getByRole('combobox', { name: 'Sort by' }));

          expect(getByText(sortKey)).toBeInTheDocument();

          await user.click(getByRole('option', { name: sortKey }));

          expect(setQueryMock).toBeCalledWith({ sort: sortKey });
        });
      });
    });

    describe('select all', () => {
      it('shows the select all button when the user is allowed to update', () => {
        const { getByLabelText } = renderML();

        expect(getByLabelText('Select all folders & assets')).toBeInTheDocument();
      });

      it('hides the select all if there are not folders and assets', () => {
        useAssets.mockReturnValueOnce({
          isLoading: false,
          error: null,
          data: {},
        });
        useFolders.mockReturnValueOnce({
          data: [],
          isLoading: false,
          error: null,
        });

        const { queryByLabelText } = renderML();

        expect(queryByLabelText('Select all assets')).not.toBeInTheDocument();
      });

      it('hides the select all button when the user is not allowed to update', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          canUpdate: true,
          canRead: true,
          canCreate: true,
        });
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: true,
          canCreate: true,
          canUpdate: false,
        });
        const { queryByLabelText } = renderML();
        expect(queryByLabelText('Select all assets')).not.toBeInTheDocument();
      });
    });

    describe('create asset', () => {
      it('hides the "Upload new asset" button when the user does not have the permissions to', async () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
          canCreate: false,
        });
        const { queryByText } = renderML();
        await waitFor(() => expect(queryByText(`Add new assets`)).not.toBeInTheDocument());
      });

      it('shows the "Upload assets" button when the user does have the permissions to', async () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: true,
          canCreate: true,
        });
        const { getByText } = renderML();
        await waitFor(() => expect(getByText(`Add new assets`)).toBeInTheDocument());
      });
    });

    describe('create folder', () => {
      it('shows the create button if the user has create permissions', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          canUpdate: true,
          canRead: true,
          canCreate: true,
        });
        const { getByText } = renderML();
        expect(getByText('Add new folder')).toBeInTheDocument();
      });

      it('hides the create button if the user does not have create permissions', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canCreate: false,
        });
        const { queryByText } = renderML();
        expect(queryByText('Add new folder')).not.toBeInTheDocument();
      });
    });
  });

  describe('content', () => {
    it('should show breadcrumbs navigation', () => {
      const { queryByLabelText } = renderML();

      expect(queryByLabelText('Folders navigation')).toBeInTheDocument();
    });

    it('should hide breadcrumbs navigation if in root folder', () => {
      useFolder.mockReturnValueOnce({ isLoading: false, data: undefined });
      const { queryByLabelText } = renderML();

      expect(queryByLabelText('Folders navigation')).not.toBeInTheDocument();
    });

    it('does display empty state upload first assets if no folder or assets', () => {
      useFolders.mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
      });

      useAssets.mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: {},
      });
      const { queryByText } = renderML();
      expect(queryByText('Upload your first assets...')).toBeInTheDocument();
    });

    it('does display empty state no results found if searching with no results', () => {
      useAssets.mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: {},
      });
      useFolders.mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
      });
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);
      const { queryByText } = renderML();
      expect(queryByText('There are no elements with the applied filters')).toBeInTheDocument();
    });

    it('does not display assets title if searching and no folders', () => {
      useFolders.mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
      });
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);
      const { queryByText } = renderML();
      expect(queryByText('Assets')).not.toBeInTheDocument();
    });

    it('does not display folders title if searching and no assets', () => {
      useAssets.mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: {},
      });
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);
      const { queryByText } = renderML();
      expect(queryByText('Folders')).not.toBeInTheDocument();
    });

    it('displays folders and folders title', () => {
      const { getByText } = renderML();

      expect(getByText('Folders (1)')).toBeInTheDocument();
      expect(getByText('1 folder, 1 asset')).toBeInTheDocument();
    });

    it('displays folder with checked checkbox when is selected', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        canUpdate: true,
        canRead: true,
        canCreate: true,
      });
      useSelectionState.mockReturnValueOnce([
        [
          {
            id: 1,
            name: 'Folder 1',
            children: { count: 1 },
            createdAt: '',
            files: { count: 1 },
            path: '/1',
            pathId: 1,
            updatedAt: '',
            type: 'folder',
          },
        ],
        { selectOne: jest.fn(), selectAll: jest.fn() },
      ]);
      const { getByTestId } = renderML();
      expect(getByTestId('folder-checkbox-1')).toBeChecked();
    });

    it('doest not displays folder with checked checkbox when is not selected', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        canUpdate: true,
        canRead: true,
        canCreate: true,
      });
      const { getByTestId } = renderML();

      expect(getByTestId('folder-checkbox-1')).not.toBeChecked();
    });

    it('does not display folders if the user does not have read permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        isLoading: false,
        canRead: false,
        canCreate: false,
      });

      const { queryByText } = renderML();

      expect(queryByText('1 folder, 1 asset')).not.toBeInTheDocument();
      expect(queryByText('Folders (1)')).not.toBeInTheDocument();
    });

    it('does display folders if a search is performed', () => {
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);

      const { queryByText } = renderML();

      expect(queryByText('1 folder, 1 asset')).toBeInTheDocument();
      expect(queryByText('Folders (1)')).toBeInTheDocument();
    });

    it('does display folders if the media library is being filtered', () => {
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { filters: 'true' } }, jest.fn()]);

      const { queryByText } = renderML();

      expect(queryByText('1 folder, 1 asset')).toBeInTheDocument();
      expect(queryByText('Folders (1)')).toBeInTheDocument();
    });

    it('does not fetch folders if the current page !== 1', () => {
      useAssets.mockReturnValueOnce({
        isLoading: false,
        data: {
          pagination: {
            ...FIXTURE_ASSET_PAGINATION,
            pageCount: 2,
            page: 2,
            total: 2,
          },
          results: FIXTURE_ASSETS,
        },
      });
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);
      renderML();
      expect(useFolders).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });

    it('does not fetch folders if the mime-type was applied', () => {
      useAssets.mockReturnValueOnce({
        isLoading: false,
        data: {
          pagination: {
            ...FIXTURE_ASSET_PAGINATION,
            pageCount: 2,
            page: 2,
            total: 2,
          },
          results: FIXTURE_ASSETS,
        },
      });
      useQueryParams.mockReturnValueOnce([
        { rawQuery: '', query: { _q: '', filters: { $and: { mime: 'audio' } } } },
        jest.fn(),
      ]);
      renderML();
      expect(useFolders).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });

    it('displays assets', () => {
      const { getByText } = renderML();
      expect(getByText('3874873.jpg')).toBeInTheDocument();
    });

    it('does not display assets if the user does not have read permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        isLoading: false,
        canRead: false,
        canCreate: false,
      });
      const { queryByText } = renderML();
      expect(queryByText('3874873.jpg')).not.toBeInTheDocument();
    });

    it('does display empty assets action, if there are no assets and no folders', () => {
      useAssets.mockReturnValueOnce({
        isLoading: false,
        data: {
          pagination: FIXTURE_ASSET_PAGINATION,
          results: [],
        },
      });
      useFolders.mockReturnValueOnce({
        isLoading: false,
        data: [],
      });
      const { queryByText } = renderML();
      expect(queryByText('Upload your first assets...')).toBeInTheDocument();
    });

    it('does not display empty assets action, if there are no assets, no folders and the user is currently filtering', () => {
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { filters: 'true' } }, jest.fn()]);
      useAssets.mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: {
          pagination: FIXTURE_ASSET_PAGINATION,
          results: [],
        },
      });
      useFolders.mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: [],
      });
      const { queryByText } = renderML();
      expect(queryByText('There are no elements with the applied filters')).toBeInTheDocument();
      expect(queryByText('header.actions.add-assets')).not.toBeInTheDocument();
    });

    describe('displays the appropriate switch to change the view', () => {
      const setView = jest.fn();

      it('starts with Grid View', async () => {
        usePersistentState.mockReturnValueOnce([viewOptions.GRID, setView]);
        const { queryByRole, user } = renderML();

        const listSwitch = queryByRole('button', { name: 'List View' });
        const gridSwitch = queryByRole('button', { name: 'Grid View' });

        expect(listSwitch).toBeInTheDocument();
        expect(gridSwitch).not.toBeInTheDocument();

        await user.click(listSwitch);
        expect(setView).toHaveBeenCalledWith(viewOptions.LIST);
      });

      it('starts with List View', async () => {
        usePersistentState.mockReturnValueOnce([viewOptions.LIST, setView]);
        const { queryByRole, user } = renderML();

        const listSwitch = queryByRole('button', { name: 'List View' });
        const gridSwitch = queryByRole('button', { name: 'Grid View' });

        expect(gridSwitch).toBeInTheDocument();
        expect(listSwitch).not.toBeInTheDocument();

        await user.click(gridSwitch);
        expect(setView).toHaveBeenCalledWith(viewOptions.GRID);
      });
    });

    describe('displays the list view', () => {
      it('should not render the sort button', () => {
        usePersistentState.mockReturnValueOnce([viewOptions.LIST]);
        const { queryByRole } = renderML();

        expect(queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
      });

      it('should not render the folders and assets titles', () => {
        usePersistentState.mockReturnValueOnce([viewOptions.LIST]);
        const { queryByText } = renderML();

        expect(queryByText('Folders (1)')).not.toBeInTheDocument();
        expect(queryByText('Assets (1)')).not.toBeInTheDocument();
      });
    });
  });
});
