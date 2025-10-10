import { useQueryParams } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { Header } from '../Header';

import type { HeaderProps } from '../Header';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: jest.fn(() => [{ rawQuery: '', query: { folder: 2 } }, jest.fn()]),
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

const setup = (props: Partial<HeaderProps>) => {
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
      <DesignSystemProvider>
        <IntlProvider locale="en">
          <MemoryRouter>
            <Header {...withDefaults} />
          </MemoryRouter>
        </IntlProvider>
      </DesignSystemProvider>
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
    (useQueryParams as jest.Mock).mockReturnValueOnce([
      { rawQuery: '', query: { folder: 2 } },
      jest.fn(),
    ]);
    const { getByText } = setup({ folder: FIXTURE_FOLDER });

    expect(getByText('Back')).toBeInTheDocument();
  });
});
