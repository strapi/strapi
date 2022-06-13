import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor, fireEvent } from '@testing-library/react';
import { useQueryParams, useSelectionState } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';

import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useFolders } from '../../../hooks/useFolders';
import { useAssets } from '../../../hooks/useAssets';
import { MediaLibrary } from '../MediaLibrary';
import en from '../../../translations/en.json';

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

jest.mock('../../../hooks/useMediaLibraryPermissions');
jest.mock('../../../hooks/useFolders');
jest.mock('../../../hooks/useFolderStructure');
jest.mock('../../../hooks/useAssets');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn().mockReturnValue([{ query: {}, rawQuery: '' }, jest.fn()]),
  useSelectionState: jest
    .fn()
    .mockReturnValue([[], { selectOne: jest.fn(), selectAll: jest.fn() }]),
}));

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id] || id) }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const renderML = () =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <MediaLibrary />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );

describe('Media library homepage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('navigation', () => {
    it('focuses the title when mounting the component', () => {
      renderML();

      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        isLoading: true,
        canCreate: false,
        canRead: false,
      });

      renderML();

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader while resolving assets', () => {
      useAssets.mockReturnValueOnce({ isLoading: true });

      renderML();

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader while resolving folders', () => {
      useFolders.mockReturnValueOnce({ isLoading: true });

      renderML();

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });
  });

  describe('general actions', () => {
    describe('filters', () => {
      it('shows the filters dropdown when the user is allowed to read', () => {
        renderML();

        expect(screen.getByText('app.utils.filters')).toBeInTheDocument();
      });

      it('hides the filters dropdown when the user is not allowed to read', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
          canCreate: false,
        });

        renderML();

        expect(screen.queryByText('app.utils.filters')).not.toBeInTheDocument();
      });
    });

    describe('sort by', () => {
      it('shows the sort by dropdown when the user is allowed to read', () => {
        renderML();

        expect(screen.getByText('Sort by')).toBeInTheDocument();
      });

      it('hides the sort by dropdown when the user is not allowed to read', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
          canCreate: false,
        });

        renderML();

        expect(screen.queryByText('Sort by')).not.toBeInTheDocument();
      });

      [
        ['Most recent uploads', 'createdAt:DESC'],
        ['Oldest uploads', 'createdAt:ASC'],
        ['Alphabetical order (A to Z)', 'name:ASC'],
        ['Reverse alphabetical order (Z to A)', 'name:DESC'],
        ['Most recent updates', 'updatedAt:DESC'],
        ['Oldest updates', 'updatedAt:ASC'],
      ].forEach(([label, sortKey]) => {
        it(`modifies the URL with the according params: ${label} ${sortKey}`, async () => {
          const setQueryMock = jest.fn();
          useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: {} }, setQueryMock]);

          renderML();

          fireEvent.mouseDown(screen.getByText('Sort by'));
          await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());
          fireEvent.mouseDown(screen.getByText(label));
          await waitFor(() => expect(screen.queryByText(label)).not.toBeInTheDocument());

          expect(setQueryMock).toBeCalledWith({ sort: sortKey });
        });
      });
    });

    describe('select all', () => {
      it('shows the select all button when the user is allowed to update', () => {
        renderML();

        expect(screen.getByLabelText('Select all assets')).toBeInTheDocument();
      });

      it('hides the select all button when the user is not allowed to update', () => {
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: true,
          canCreate: true,
          canUpdate: false,
        });

        renderML();

        expect(screen.queryByLabelText('Select all assets')).not.toBeInTheDocument();
      });
    });

    describe('create asset', () => {
      it('hides the "Upload new asset" button when the user does not have the permissions to', async () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
          canCreate: false,
        });

        renderML();

        await waitFor(() => expect(screen.queryByText(`Add new assets`)).not.toBeInTheDocument());
      });

      it('shows the "Upload assets" button when the user does have the permissions to', async () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: true,
          canCreate: true,
        });

        renderML();

        await waitFor(() => expect(screen.getByText(`Add new assets`)).toBeInTheDocument());
      });
    });

    describe('create folder', () => {
      it('shows the create button if the user has create permissions', () => {
        renderML();

        expect(screen.getByText('header.actions.add-folder')).toBeInTheDocument();
      });

      it('hides the create button if the user does not have create permissions', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canCreate: false,
        });

        renderML();

        expect(screen.queryByText('header.actions.add-folder')).not.toBeInTheDocument();
      });
    });
  });

  describe('content', () => {
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
      renderML();

      expect(screen.queryByText('Upload your first assets...')).toBeInTheDocument();
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
      renderML();

      expect(
        screen.queryByText('There are no elements with the applied filters')
      ).toBeInTheDocument();
    });

    it('does not display assets title if searching and no folders', () => {
      useFolders.mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
      });
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);
      renderML();

      expect(screen.queryByText('Assets')).not.toBeInTheDocument();
    });

    it('does not display folders title if searching and no assets', () => {
      useAssets.mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: {},
      });
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);
      renderML();

      expect(screen.queryByText('Folders')).not.toBeInTheDocument();
    });

    it('displays folders and folders title', () => {
      renderML();

      expect(screen.queryByText('Folders')).toBeInTheDocument();
      expect(screen.getByText('Folder 1')).toBeInTheDocument();
    });

    it('displays folder with checked checkbox when is selected', () => {
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
      renderML();

      expect(screen.getByTestId('folder-checkbox-1')).toBeChecked();
    });

    it('doest not displays folder with checked checkbox when is not selected', () => {
      renderML();

      expect(screen.getByTestId('folder-checkbox-1')).not.toBeChecked();
    });

    it('does not display folders if the user does not have read permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        isLoading: false,
        canRead: false,
        canCreate: false,
      });

      renderML();

      expect(screen.queryByText('list.folders.title')).not.toBeInTheDocument();
      expect(screen.queryByText('Folder 1')).not.toBeInTheDocument();
    });

    it('does display folders if a search is performed', () => {
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { _q: 'true' } }, jest.fn()]);

      renderML();

      expect(screen.queryByText('Folders')).toBeInTheDocument();
      expect(screen.queryByText('Folder 1')).toBeInTheDocument();
    });

    it('does not display folders if the media library is being filtered', () => {
      useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { filters: 'true' } }, jest.fn()]);

      renderML();

      expect(screen.queryByText('Folders')).toBeInTheDocument();
      expect(screen.queryByText('Folder 1')).toBeInTheDocument();
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
      renderML();

      expect(screen.getByText('3874873.jpg')).toBeInTheDocument();
    });

    it('does not display assets if the user does not have read permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        isLoading: false,
        canRead: false,
        canCreate: false,
      });

      renderML();

      expect(screen.queryByText('3874873.jpg')).not.toBeInTheDocument();
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

      renderML();

      expect(screen.queryByText('Upload your first assets...')).toBeInTheDocument();
    });

    it('does not display empty assets action, if there are no assets and the user does not have create permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({
        isLoading: false,
        canCreate: false,
        canRead: false,
      });
      useAssets.mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: {
          pagination: FIXTURE_ASSET_PAGINATION,
          results: FIXTURE_ASSETS,
        },
      });

      renderML();

      expect(screen.queryByText('header.actions.add-assets')).not.toBeInTheDocument();
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

      renderML();

      expect(
        screen.queryByText('There are no elements with the applied filters')
      ).toBeInTheDocument();
      expect(screen.queryByText('header.actions.add-assets')).not.toBeInTheDocument();
    });
  });
});
