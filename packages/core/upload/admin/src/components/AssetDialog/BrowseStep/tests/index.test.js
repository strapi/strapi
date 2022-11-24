import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, fireEvent, screen } from '@testing-library/react';
import { NotificationsProvider, usePersistentState } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';

import { useFolder } from '../../../../hooks/useFolder';
import { BrowseStep } from '..';
import { viewOptions } from '../../../../constants';

jest.mock('../../../../hooks/useFolder');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
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
    createdAt: '',
    pathId: 1,
    name: 'Folder 1',
    children: {
      count: 1,
    },
    files: {
      count: 1,
    },
    updatedAt: '',
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

const ComponentFixture = (props) => {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <IntlProvider messages={{}} locale="en">
            <NotificationsProvider toggleNotification={() => {}}>
              <BrowseStep
                assets={[]}
                canCreate
                canRead
                folders={FIXTURE_FOLDERS}
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
              />
            </NotificationsProvider>
          </IntlProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);
describe('BrowseStep', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.only('renders and match snapshot', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });

  it('should not fetch folder if the user does not have the permission', () => {
    const spy = jest.fn().mockReturnValueOnce({ isLoading: false });
    useFolder.mockImplementationOnce(spy);

    setup({
      canRead: false,
      queryObject: { folder: 1, page: 1, pageSize: 10, filters: { $and: [] } },
    });

    expect(spy).toHaveBeenCalledWith(1, { enabled: false });
  });

  it('should show breadcrumbs navigation', () => {
    setup();

    expect(screen.queryByLabelText('Folders navigation')).toBeInTheDocument();
  });

  it('should hide breadcrumbs navigation if in root folder', () => {
    useFolder.mockReturnValueOnce({ isLoading: false, data: undefined });
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
        name: /folder 1 : 1 folder, 1 asset/i,
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
    it('Start with Grid View', () => {
      usePersistentState.mockReturnValueOnce([viewOptions.GRID, setView]);
      const { queryByRole } = setup();

      const listSwitch = queryByRole('button', { name: 'List View' });
      const gridSwitch = queryByRole('button', { name: 'Grid View' });

      expect(listSwitch).toBeInTheDocument();
      expect(gridSwitch).not.toBeInTheDocument();

      fireEvent.click(listSwitch);
      expect(setView).toHaveBeenCalledWith(viewOptions.LIST);
    });

    it('Start with List View', () => {
      usePersistentState.mockReturnValueOnce([viewOptions.LIST, setView]);
      const { queryByRole } = setup();

      const listSwitch = queryByRole('button', { name: 'List View' });
      const gridSwitch = queryByRole('button', { name: 'Grid View' });

      expect(gridSwitch).toBeInTheDocument();
      expect(listSwitch).not.toBeInTheDocument();

      fireEvent.click(gridSwitch);
      expect(setView).toHaveBeenCalledWith(viewOptions.GRID);
    });
  });
});
