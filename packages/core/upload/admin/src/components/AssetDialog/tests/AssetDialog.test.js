import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AssetDialog } from '..';
import { useFolders } from '../../../hooks/useFolders';
import { useAssets } from '../../../hooks/useAssets';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import useModalQueryParams from '../../../hooks/useModalQueryParams';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn(),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

jest.mock('../../../hooks/useMediaLibraryPermissions');
jest.mock('../../../hooks/useFolders');
jest.mock('../../../hooks/useAssets');
jest.mock('../../../hooks/useModalQueryParams');

console.error = jest.fn();

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
          <IntlProvider locale="en" messages={{}}>
            <AssetDialog {...props} />
          </IntlProvider>
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
      expect(screen.getByText('Content is loading.')).toBeInTheDocument();
    });

    it('shows a loader when resolving assets', () => {
      useAssets.mockReturnValueOnce({
        isLoading: true,
        error: null,
        data: { pagination: {}, results: [] },
      });

      renderML();

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Content is loading.')).toBeInTheDocument();
    });

    it('shows a loader when resolving folders', () => {
      useFolders.mockReturnValueOnce({ isLoading: true, error: null, data: null });

      renderML();

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Content is loading.')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    describe('empty state', () => {
      it('shows a specific empty state when the user is not allowed to see the content', () => {
        useMediaLibraryPermissions.mockReturnValueOnce({
          isLoading: false,
          canRead: false,
        });

        renderML();

        expect(
          screen.getByText("You don't have the permissions to access that content")
        ).toBeInTheDocument();

        expect(screen.queryByText('Folders')).not.toBeInTheDocument();
        expect(screen.queryByText('Assets')).not.toBeInTheDocument();

        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
      });
    });

    describe('error state', () => {
      it('shows when loading assets threw an error', () => {
        useAssets.mockReturnValueOnce({ isLoading: false, error: true });

        renderML();

        expect(
          screen.getByText('Woops! Something went wrong. Please, try again.')
        ).toBeInTheDocument();
      });

      it('shows when loading folders threw an error', () => {
        useAssets.mockReturnValueOnce({ isLoading: false, error: true });

        renderML();

        expect(
          screen.getByText('Woops! Something went wrong. Please, try again.')
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
        useAssets.mockReturnValueOnce({
          isLoading: false,
          error: null,
          data: { pagination: { page: 2 } },
        });

        expect(screen.queryByText('Folder 1')).not.toBeInTheDocument();
      });

      it('does not display folders, if the mime-type filter was applied', () => {
        useModalQueryParams.mockReturnValueOnce([
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
});
