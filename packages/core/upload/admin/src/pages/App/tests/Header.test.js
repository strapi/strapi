import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render } from '@testing-library/react';
import { useQueryParams } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { Header } from '../components/Header';
import { useFolderStructure } from '../../../hooks/useFolderStructure';

jest.mock('../../../hooks/useFolderStructure');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: jest.fn().mockReturnValue([{ query: {}, rawQuery: '' }, jest.fn()]),
}));

const setup = props => {
  const withDefaults = {
    ...props,
    assetCount: 2,
    folderCount: 2,
    canCreate: true,
    onToggleEditFolderDialog: jest.fn(),
    onToggleUploadAssetDialog: jest.fn(),
  };

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
        <IntlProvider locale="en">
          <MemoryRouter>
            <Header {...withDefaults} />
          </MemoryRouter>
        </IntlProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Header', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });

  test('truncates long folder lavels', () => {
    useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { folder: 2 } }, jest.fn()]);
    useFolderStructure.mockReturnValueOnce({
      isLoading: false,
      error: null,
      data: [
        {
          value: null,
          label: 'Media Library',
          children: [
            {
              value: 1,
              label: 'Cats',
              children: [
                {
                  value: 2,
                  label: 'The length of this label exceeds the maximum',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });

    const { queryByText } = setup();
    expect(queryByText('Media Library - The length of this label excee...')).toBeInTheDocument();
  });

  test('does not render a back button at the root level of the media library', () => {
    const { queryByText } = setup();

    expect(queryByText('Back')).not.toBeInTheDocument();
  });

  test('does render a back button at a nested level of the media library', () => {
    useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { folder: 2 } }, jest.fn()]);
    const { queryByText } = setup();

    expect(queryByText('Back')).toBeInTheDocument();
  });
});
