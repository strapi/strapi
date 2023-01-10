import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render as renderTL, screen } from '@testing-library/react';
import { TrackingProvider } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { useConfig } from '../../../hooks/useConfig';
import Upload from '..';

jest.mock('../../../hooks/useConfig');
jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
}));
jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: (x) => x,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const renderUpload = () =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={{}}>
        <TrackingProvider>
          <ThemeProvider theme={lightTheme}>
            <MemoryRouter>
              <Upload />
            </MemoryRouter>
          </ThemeProvider>
        </TrackingProvider>
      </IntlProvider>
    </QueryClientProvider>
  );

describe('Upload Plugin', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial render', () => {
    it('focuses the title when mounting the component', () => {
      renderUpload();
      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  describe('error state', () => {
    it('returns null with an error', () => {
      useConfig.mockReturnValueOnce({
        config: {
          isLoading: false,
          isError: true,
          error: 'An error occurred',
          data: {},
        },
      });
      renderUpload();
      expect(screen.getByRole('main')).toHaveFocus();
      expect(screen.getByRole('main')).toBeEmptyDOMElement();
    });
  });

  describe('loading state', () => {
    it('shows a loader when resolving media library configuration', () => {
      useConfig.mockReturnValueOnce({
        config: {
          isLoading: true,
          isError: false,
          error: '',
          data: {},
        },
      });
      renderUpload();
      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });
  });
});
