import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRBAC, useQueryParams, TrackingContext } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { rest } from 'msw';
import { MediaLibrary } from '../MediaLibrary';
import en from '../../../translations/en.json';
import server from './server';
import { assetResultMock } from './asset.mock';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn(),
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
      <TrackingContext.Provider value={{ uuid: false, telemetryProperties: undefined }}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <MediaLibrary />
          </MemoryRouter>
        </ThemeProvider>
      </TrackingContext.Provider>
    </QueryClientProvider>
  );

describe('Media library homepage', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    useRBAC.mockReturnValue({
      isLoading: false,
      allowedActions: {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canCopyLink: true,
        canDownload: true,
      },
    });

    useQueryParams.mockReturnValue([{ rawQuery: 'some-url', query: {} }, jest.fn()]);
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => server.close());

  describe('navigation', () => {
    it('focuses the title when mounting the component', () => {
      renderML();

      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      useRBAC.mockReturnValue({ isLoading: true, allowedActions: {} });

      renderML();

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });

    it('shows a loader when resolving the assets', () => {
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
        useRBAC.mockReturnValue({
          isLoading: false,
          allowedActions: {
            canRead: false,
            canCreate: true,
            canUpdate: false,
          },
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
        useRBAC.mockReturnValue({
          isLoading: false,
          allowedActions: {
            canRead: false,
            canCreate: true,
            canUpdate: false,
          },
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
        useRBAC.mockReturnValue({
          isLoading: false,
          allowedActions: {
            canRead: true,
            canCreate: true,
            canUpdate: false,
          },
        });

        renderML();

        expect(screen.queryByLabelText('Select all assets')).not.toBeInTheDocument();
      });
    });

    describe('create asset', () => {
      it('hides the "Upload new asset" button when the user does not have the permissions to', async () => {
        useRBAC.mockReturnValue({
          isLoading: false,
          allowedActions: {
            canRead: true,
            canCreate: false,
          },
        });

        renderML();

        await waitFor(() => expect(screen.queryByText(`Add new assets`)).not.toBeInTheDocument());
      });

      it('shows the "Upload assets" button when the user does have the permissions to', async () => {
        useRBAC.mockReturnValue({
          isLoading: false,
          allowedActions: {
            canRead: true,
            canCreate: true,
          },
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
        renderML();

        await waitFor(() =>
          expect(screen.getByText('Upload your first assets...')).toBeInTheDocument()
        );

        expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('false');
      });

      it('shows an empty state when there are no assets and that there s a search', async () => {
        useQueryParams.mockReturnValue([{ rawQuery: '', query: { _q: 'hello-moto' } }]);

        renderML();

        await waitFor(() =>
          expect(
            screen.getByText('There are no assets with the applied filters')
          ).toBeInTheDocument()
        );

        expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('false');
      });

      it('shows an empty state when there are no assets and that there s a filter', async () => {
        useQueryParams.mockReturnValue([{ rawQuery: '', query: { filters: [{ key: 'value' }] } }]);

        renderML();

        await waitFor(() =>
          expect(
            screen.getByText('There are no assets with the applied filters')
          ).toBeInTheDocument()
        );

        expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('false');
      });

      it('shows a specific empty state when the user is not allowed to see the content', async () => {
        useRBAC.mockReturnValue({
          isLoading: false,
          allowedActions: {
            canRead: false,
          },
        });

        renderML();

        await waitFor(() =>
          expect(
            screen.getByText(`app.components.EmptyStateLayout.content-permissions`)
          ).toBeInTheDocument()
        );

        expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('false');
      });

      it('shows a specific empty state when the user can read but not create', async () => {
        useRBAC.mockReturnValue({
          isLoading: false,
          allowedActions: {
            canRead: true,
            canCreate: false,
          },
        });

        renderML();

        await waitFor(() =>
          expect(screen.getByText(`The asset list is empty.`)).toBeInTheDocument()
        );
        await waitFor(() =>
          expect(screen.queryByText('Upload your first assets...')).not.toBeInTheDocument()
        );

        expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('false');
      });
    });

    describe('content resolved', () => {
      beforeEach(() => {
        server.use(rest.get('*/upload/files*', (req, res, ctx) => res(ctx.json(assetResultMock))));
      });

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
