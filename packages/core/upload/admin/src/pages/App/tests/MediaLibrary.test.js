import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor, fireEvent } from '@testing-library/react';
import { useQueryParams } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';

import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useFolderStructure } from '../../../hooks/useFolderStructure';
import { useFolders } from '../../../hooks/useFolders';
import { useAssets } from '../../../hooks/useAssets';
import { MediaLibrary } from '../MediaLibrary';
import en from '../../../translations/en.json';

jest.mock('../../../hooks/useMediaLibraryPermissions', () => ({
  useMediaLibraryPermissions: jest.fn().mockReturnValue({
    isLoading: false,
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canCopyLink: true,
    canDownload: true,
  }),
}));

jest.mock('../../../hooks/useFolderStructure', () => ({
  useFolderStructure: jest.fn().mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      results: {
        value: null,
        label: 'Media Library',
        children: [],
      },
    },
  }),
}));

jest.mock('../../../hooks/useFolders', () => ({
  useFolders: jest.fn().mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      results: [
        {
          id: 1,
          name: 'Folder 1',
          children: {
            count: 1,
          },
          files: {
            count: 1,
          },
        },
      ],
    },
  }),
}));

jest.mock('../../../hooks/useAssets', () => ({
  useAssets: jest.fn().mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      pagination: {
        pageCount: 1,
        page: 1,
        pageSize: 10,
        total: 1,
      },
      results: [
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
      ],
    },
  }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn().mockReturnValue([{ query: {}, rawQuery: '' }, jest.fn()]),
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
      useMediaLibraryPermissions.mockReturnValue({ isLoading: true });

      renderML();

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader while resolving assets', () => {
      useAssets.mockReturnValue({ isLoading: true });

      renderML();

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader while resolving folders', () => {
      useFolders.mockReturnValue({ isLoading: true });

      renderML();

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader while resolving the folder structure', () => {
      useFolderStructure.mockReturnValue({ isLoading: true });

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
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: false,
          canCreate: true,
          canUpdate: false,
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
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: false,
          canCreate: true,
          canUpdate: false,
        });

        renderML();

        expect(screen.queryByText('Sort by')).not.toBeInTheDocument();
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
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: true,
          canCreate: false,
        });

        renderML();

        await waitFor(() => expect(screen.queryByText(`Add new assets`)).not.toBeInTheDocument());
      });

      it('shows the "Upload assets" button when the user does have the permissions to', async () => {
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: true,
          canCreate: true,
        });

        renderML();

        await waitFor(() => expect(screen.getByText(`Add new assets`)).toBeInTheDocument());
      });
    });

    describe('Sort by', () => {
      [
        ['Most recent uploads', 'createdAt:DESC'],
        ['Oldest uploads', 'createdAt:ASC'],
        ['Alphabetical order (A to Z)', 'name:ASC'],
        ['Reverse alphabetical order (Z to A)', 'name:DESC'],
        ['Most recent updates', 'updatedAt:DESC'],
        ['Oldest updates', 'updatedAt:ASC'],
      ].forEach(([label, sortKey]) => {
        it('modifies the URL with the according params', async () => {
          const setQueryMock = jest.fn();
          useQueryParams.mockReturnValue([{ rawQuery: '', query: {} }, setQueryMock]);

          renderML();

          fireEvent.mouseDown(screen.getByText('Sort by'));
          await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());
          fireEvent.mouseDown(screen.getByText(label));
          await waitFor(() => expect(screen.queryByText(label)).not.toBeInTheDocument());

          expect(setQueryMock).toBeCalledWith({ sort: sortKey });
        });
      });
    });
  });

  describe('content', () => {
    describe('empty state', () => {
      it('shows an empty state when there are no assets and the user is allowed to read', async () => {
        useAssets.mockReturnValue({ data: { results: [] } });

        renderML();

        await waitFor(() =>
          expect(screen.getByText('Upload your first assets...')).toBeInTheDocument()
        );
      });

      it('shows an empty state when there are no assets and that there s a search', async () => {
        useQueryParams.mockReturnValue([{ rawQuery: '', query: { _q: 'hello-moto' } }, jest.fn()]);
        useAssets.mockReturnValue({ data: { results: [] } });

        renderML();

        await waitFor(() =>
          expect(
            screen.getByText('There are no assets with the applied filters')
          ).toBeInTheDocument()
        );
      });

      it('shows a specific empty state when the user is not allowed to see the content', async () => {
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: false,
        });

        renderML();

        await waitFor(() =>
          expect(
            screen.getByText(`app.components.EmptyStateLayout.content-permissions`)
          ).toBeInTheDocument()
        );
      });

      it('shows a specific empty state when the user can read but not create', async () => {
        useMediaLibraryPermissions.mockReturnValue({
          isLoading: false,
          canRead: true,
          canCreate: false,
        });

        renderML();

        await waitFor(() =>
          expect(screen.queryByText('Upload your first assets...')).not.toBeInTheDocument()
        );
      });
    });

    describe('content resolved', () => {
      it('shows an asset when the data resolves', async () => {
        renderML();

        await waitFor(() => expect(screen.getByText('3874873.jpg')).toBeInTheDocument());

        expect(
          screen.getByText((_, element) => element.textContent === 'jpg - 400✕400')
        ).toBeInTheDocument();
        expect(screen.getByText('Image')).toBeInTheDocument();
        expect(screen.getByLabelText('Edit')).toBeInTheDocument();
      });
    });
  });
});
