// TODO: find a better naming convention for the file that was an index file before
import { NotificationsProvider } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { viewOptions } from '../../../../constants';
import { useFolder } from '../../../../hooks/useFolder';
import { usePersistentState } from '../../../../hooks/usePersistentState';
import { BrowseStep } from '../BrowseStep';

import type { BrowseStepProps } from '../BrowseStep';

jest.mock('../../../../hooks/useFolder');

jest.mock('../../../../hooks/usePersistentState', () => ({
  usePersistentState: jest.fn().mockReturnValue([0, jest.fn()]),
}));

const FIXTURE_ASSETS = [
  {
    id: 77,
    name: '3874873.jpg',
    alternativeText: null,
    caption: null,
    width: 400,
    height: 400,
    formats: {
      thumbnail: {
        name: 'thumbnail_3874873.jpg',
        hash: 'thumbnail_3874873_b5818bb250',
        ext: '.jpg',
        mime: 'image/jpeg',
        width: 156,
        height: 156,
        size: 3.97,
        path: null,
        url: '/uploads/thumbnail_3874873_b5818bb250.jpg',
      },
    },
    hash: '3874873_b5818bb250',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 11.79,
    url: '/uploads/3874873_b5818bb250.jpg',
    previewUrl: null,
    provider: 'local',
    provider_metadata: null,
    createdAt: '2021-10-18T08:04:56.326Z',
    updatedAt: '2021-10-18T08:04:56.326Z',
  },
];

const FIXTURE_FOLDERS = [
  {
    id: 1,
    createdAt: '2021-10-18T08:04:56.326Z',
    pathId: 1,
    name: 'Folder 1',
    children: {
      count: 1,
    },
    files: {
      count: 1,
    },
    updatedAt: '2021-10-18T08:04:56.326Z',
    path: '/1',
  },
];

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const setup = (props?: Partial<BrowseStepProps>) =>
  render(
    <BrowseStep
      assets={[]}
      canCreate
      canRead
      folders={FIXTURE_FOLDERS as unknown as BrowseStepProps['folders']}
      onAddAsset={jest.fn()}
      onChangeFilters={jest.fn()}
      onChangePage={jest.fn()}
      onChangePageSize={jest.fn()}
      onChangeSearch={jest.fn()}
      onChangeSort={jest.fn()}
      onChangeFolder={jest.fn()}
      onEditAsset={jest.fn()}
      onEditFolder={jest.fn()}
      onSelectAllAsset={jest.fn()}
      onSelectAsset={jest.fn()}
      pagination={{ pageCount: 1 }}
      queryObject={{ page: 1, pageSize: 10, filters: { $and: [] } }}
      selectedAssets={[]}
      {...props}
    />,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <DesignSystemProvider>
            <MemoryRouter>
              <IntlProvider messages={{}} locale="en">
                <NotificationsProvider>{children}</NotificationsProvider>
              </IntlProvider>
            </MemoryRouter>
          </DesignSystemProvider>
        </QueryClientProvider>
      ),
    }
  );
describe('BrowseStep', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the core UI elements correctly', () => {
    const { getByText, getByLabelText } = setup();

    // Check for the folder section with correct count
    expect(getByText('Folders (1)')).toBeInTheDocument();

    // Check for folder navigation
    expect(getByLabelText('Folders navigation')).toBeInTheDocument();

    // Verify folder card contains expected info
    const folderButton = screen.getByRole('button', { name: /folder 1 - 1 folder, 1 asset/i });
    expect(folderButton).toBeInTheDocument();

    // Check for core UI controls
    expect(screen.getByRole('button', { name: /List View/i })).toBeInTheDocument();

    // Verify the search functionality is available
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();

    // Check for filters
    expect(screen.getByText('Filters')).toBeInTheDocument();

    // Check for sort option
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  it('should not fetch folder if the user does not have the permission', () => {
    const spy = jest.fn().mockReturnValueOnce({ isLoading: false });
    (useFolder as jest.Mock).mockImplementationOnce(spy);

    setup({
      canRead: false,
      queryObject: { folder: 1, page: 1, pageSize: 10, filters: { $and: [] } },
    });

    expect(spy).toHaveBeenCalledWith(1, { enabled: false });
  });

  it('should show breadcrumbs navigation', () => {
    setup();

    expect(screen.getByLabelText('Folders navigation')).toBeInTheDocument();
  });

  it('should hide breadcrumbs navigation if in root folder', () => {
    (useFolder as jest.Mock).mockReturnValueOnce({ isLoading: false, data: undefined });
    setup();

    expect(screen.queryByLabelText('Folders navigation')).not.toBeInTheDocument();
  });

  it('calls onAddAsset callback', () => {
    const spy = jest.fn();
    const { getByText } = setup({ onAddAsset: spy, folders: [] });
    fireEvent.click(getByText('Add new assets'));
    expect(spy).toHaveBeenCalled();
  });

  it('calls onChangeFolder callback', () => {
    const spy = jest.fn();
    const { getByRole } = setup({ onChangeFolder: spy });
    fireEvent.click(
      getByRole('button', {
        name: /folder 1 - 1 folder, 1 asset/i,
      })
    );
    expect(spy).toHaveBeenCalled();
  });

  it('does display empty state upload first assets if no folder or assets', () => {
    setup({ folders: [], assets: [] });
    expect(screen.getByText('Upload your first assets...')).toBeInTheDocument();
  });

  it('does display empty state no results found if searching with no results', () => {
    setup({
      folders: [],
      assets: [],
      queryObject: { page: 1, pageSize: 10, filters: { $and: [] }, _q: 'true' },
    });
    expect(screen.getByText('There are no assets with the applied filters')).toBeInTheDocument();
  });

  it('does display filters, even if no assets or folders were found', () => {
    setup({
      folders: [],
      assets: [],
      queryObject: { page: 1, pageSize: 10, filters: { $and: [{ mime: 'audio' }] }, _q: '' },
    });
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('does not display assets title if searching and no folders', () => {
    setup({
      folders: [],
      assets: FIXTURE_ASSETS,
      queryObject: { page: 1, pageSize: 10, filters: { $and: [] }, _q: 'true' },
    });
    expect(screen.queryByText('Assets')).not.toBeInTheDocument();
  });

  it('does not display folders title if searching and no assets', () => {
    setup({
      queryObject: { page: 1, pageSize: 10, filters: { $and: [] }, _q: 'true' },
    });
    expect(screen.queryByText('Folders')).not.toBeInTheDocument();
  });

  it('displays assets and folders titles when there are folders and assets', () => {
    setup({
      assets: FIXTURE_ASSETS,
    });

    expect(screen.getByText('Folders (1)')).toBeInTheDocument();
    expect(screen.getByText('Assets (1)')).toBeInTheDocument();
  });

  describe('displays the appropriate switch to change the view', () => {
    const setView = jest.fn();
    it('starts with Grid View', () => {
      (usePersistentState as jest.Mock).mockReturnValueOnce([viewOptions.GRID, setView]);
      const { queryByRole } = setup();

      const listSwitch = queryByRole('button', { name: 'List View' });
      const gridSwitch = queryByRole('button', { name: 'Grid View' });

      expect(listSwitch).toBeInTheDocument();
      expect(gridSwitch).not.toBeInTheDocument();

      if (listSwitch) {
        fireEvent.click(listSwitch);
        expect(setView).toHaveBeenCalledWith(viewOptions.LIST);
      }
    });

    it('starts with List View', () => {
      (usePersistentState as jest.Mock).mockReturnValueOnce([viewOptions.LIST, setView]);
      const { queryByRole } = setup();

      const listSwitch = queryByRole('button', { name: 'List View' });
      const gridSwitch = queryByRole('button', { name: 'Grid View' });

      expect(gridSwitch).toBeInTheDocument();
      expect(listSwitch).not.toBeInTheDocument();

      if (gridSwitch) {
        fireEvent.click(gridSwitch);
        expect(setView).toHaveBeenCalledWith(viewOptions.GRID);
      }
    });
  });

  describe('displays the list view', () => {
    it('should render the table headers', () => {
      (usePersistentState as jest.Mock).mockReturnValueOnce([viewOptions.LIST]);

      const { getByText, getByRole } = setup();
      expect(getByRole('gridcell', { name: 'preview' })).toBeInTheDocument();
      expect(getByText('name')).toBeInTheDocument();
      expect(getByRole('gridcell', { name: 'extension' })).toBeInTheDocument();
      expect(getByRole('gridcell', { name: 'size' })).toBeInTheDocument();
      expect(getByText('created')).toBeInTheDocument();
      expect(getByText('last update')).toBeInTheDocument();
    });

    it('should not render the sort button', () => {
      (usePersistentState as jest.Mock).mockReturnValueOnce([viewOptions.LIST]);
      const { queryByRole } = setup();

      expect(queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
    });

    it('should not render the folders and assets titles', () => {
      (usePersistentState as jest.Mock).mockReturnValueOnce([viewOptions.LIST]);
      const { queryByText } = setup();

      expect(queryByText('Folders (1)')).not.toBeInTheDocument();
      expect(queryByText('Assets (1)')).not.toBeInTheDocument();
    });

    it('should not render table if no assets and folders', () => {
      (usePersistentState as jest.Mock).mockReturnValueOnce([viewOptions.LIST]);
      const { queryByRole, getByText } = setup({ folders: [] });

      expect(queryByRole('gridcell', { name: /preview/i })).not.toBeInTheDocument();
      expect(getByText('Upload your first assets...')).toBeInTheDocument();
    });
  });
});
