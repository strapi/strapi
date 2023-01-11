import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render } from '@testing-library/react';
import { useQueryParams } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { Header } from '../Header';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: jest.fn().mockReturnValue([{ query: {}, rawQuery: '' }, jest.fn()]),
}));

const FIXTURE_FOLDER = {
  id: 1,
  name: 'Folder 1',
  children: {
    count: 1,
  },
  createdAt: '',
  files: {
    count: 1,
  },
  path: '/1',
  pathId: 1,
  updatedAt: '',
  parent: {
    id: 2,
    name: 'Folder 2',
    children: {
      count: 1,
    },
    createdAt: '',
    files: {
      count: 1,
    },
    path: '/1',
    pathId: 1,
    updatedAt: '',
  },
};

const setup = (props) => {
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
    const { container } = setup({ folder: FIXTURE_FOLDER });

    expect(container).toMatchSnapshot();
  });

  test('does not render a back button at the root level of the media library', () => {
    const { queryByText } = setup({ folder: null });

    expect(queryByText('Back')).not.toBeInTheDocument();
  });

  test('does render a back button at a nested level of the media library', () => {
    useQueryParams.mockReturnValueOnce([{ rawQuery: '', query: { folder: 2 } }, jest.fn()]);
    const { queryByText } = setup({ folder: FIXTURE_FOLDER });

    expect(queryByText('Back')).toBeInTheDocument();
  });
});
