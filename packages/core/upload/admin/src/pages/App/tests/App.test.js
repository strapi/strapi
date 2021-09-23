import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen, waitFor } from '@testing-library/react';
import { useRBAC } from '@strapi/helper-plugin';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import reducers from '../../../reducers';
import en from '../../../translations/en.json';
import server from './server';
import MediaLibraryPage from '..';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useNotification: jest.fn(() => jest.fn()),
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

const store = createStore(combineReducers(reducers));

const renderML = () =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <MediaLibraryPage />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
  );

describe('Media library homepage', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    useRBAC.mockReturnValue({ isLoading: false, allowedActions: { canMain: true } });
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
