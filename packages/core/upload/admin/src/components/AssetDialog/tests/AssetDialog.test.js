import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor } from '@testing-library/react';
import { useRBAC, useQueryParams } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { rest } from 'msw';
import { AssetDialog } from '..';
import en from '../../../translations/en.json';
import server from './server';
import { assetResultMock } from './asset.mock';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn(),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

jest.mock('../../../utils/getTrad', () => x => x);

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

const renderML = (props = { onClose: jest.fn(), multiple: false, initiallySelectedAssets: [] }) =>
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

    useQueryParams.mockReturnValue([{ rawQuery: 'some-url' }, jest.fn()]);
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => server.close());

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      useRBAC.mockReturnValue({ isLoading: true, allowedActions: {} });

      renderML();

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading the asset list.')).toBeInTheDocument();
    });

    it('shows a loader when resolving the assets', () => {
      renderML();

      expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading the asset list.')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    describe('empty state', () => {
      it('shows an empty state when there are no assets and the user is allowed to read', async () => {
        renderML();

        await waitFor(() =>
          expect(screen.getByText('Upload your first assets...')).toBeInTheDocument()
        );

        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
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

        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
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

        expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe(null);
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
