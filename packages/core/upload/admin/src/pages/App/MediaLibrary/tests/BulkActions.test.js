import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { BulkActions } from '../components/BulkActions';

jest.mock('../../../../hooks/useBulkRemove');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useQueryParams: jest.fn().mockReturnValue([{ query: {}, rawQuery: '' }, jest.fn()]),
}));

const setup = (
  props = {
    selected: [],
    onSuccess: jest.fn(),
  }
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <IntlProvider locale="en">
            <BulkActions {...props} />
          </IntlProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('BulkActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });

  test('displays the proper assets and folders count', () => {
    const ASSET_COUNT = 2;
    const FOLDER_COUNT = 8;

    const { queryByText } = setup({
      onSuccess: jest.fn(),
      selected: [
        ...[...Array(ASSET_COUNT).keys()].map((index) => ({ id: index, type: 'asset' })),
        ...[...Array(FOLDER_COUNT).keys()].map((index) => ({ id: index, type: 'folder' })),
      ],
    });

    expect(
      queryByText(`${FOLDER_COUNT} folders - ${ASSET_COUNT} assets selected`)
    ).toBeInTheDocument();
  });
});
