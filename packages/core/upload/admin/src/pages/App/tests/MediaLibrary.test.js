import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor } from '@testing-library/react';
import { useRBAC } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import en from '../../../translations/en.json';
import server from './server';
import { MediaLibrary } from '../MediaLibrary';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: () => [{ rawQuery: 'some-url' }, jest.fn()],
}));

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
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
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => server.close());

  describe('loading state', () => {
    it('shows a loader when resolving the permissions', () => {
      useRBAC.mockReturnValue({ isLoading: true, allowedActions: { canMain: false } });

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

  describe('empty state', () => {
    it('shows an empty state when there are no assets found', async () => {
      renderML();

      await waitFor(() =>
        expect(screen.getByText('Upload your first assets...')).toBeInTheDocument()
      );

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('false');
    });
  });
});
