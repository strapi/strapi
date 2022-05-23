import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AssetDialog } from '..';
import en from '../../../translations/en.json';
import { useFolders } from '../../../hooks/useFolders';
import { useAssets } from '../../../hooks/useAssets';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn(),
}));

jest.mock('../../../utils/getTrad', () => x => x);

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id] || id) }),
}));

jest.mock('../../../hooks/useMediaLibraryPermissions', () => ({
  useMediaLibraryPermissions: jest.fn().mockReturnValue({
    canRead: true,
    canCreate: true,
    isLoading: false,
    canUpdate: true,
    canCopyLink: true,
    canDownload: true,
  }),
}));

jest.mock('../../../hooks/useFolders', () => ({
  useFolders: jest.fn().mockReturnValue({
    isLoading: false,
    error: null,
    data: [
      {
        id: 1,
        name: 'Folder 1',
        children: {
          count: 1,
        },
        createdAt: '',
        files: {
          count: 1,
        },
        path: '/folder-1',
        uid: 'folder-1',
        updatedAt: '',
      },
    ],
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <AssetDialog {...props} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );

describe('AssetDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      useMediaLibraryPermissions.mockReturnValueOnce({ isLoading: true });

      renderML();

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading the asset list.')).toBeInTheDocument();
    });

    it('shows a loader when resolving assets', () => {
      useAssets.mockReturnValueOnce({
        isLoading: true,
        error: null,
        data: { pagination: {}, results: [] },
      });

      renderML();

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading the asset list.')).toBeInTheDocument();
    });

    it('shows a loader when resolving folders', () => {
      useFolders.mockReturnValueOnce({ isLoading: true, error: null, data: null });

      renderML();

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading the asset list.')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    describe('empty state', () => {
      it('shows a specific empty state when the user is not allowed to see the content', async () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
        });

        renderML();

        await waitFor(() =>
          expect(
            screen.getByText(`app.components.EmptyStateLayout.content-permissions`)
          ).toBeInTheDocument()
        );

        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
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
    });
  });
});
