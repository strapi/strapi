import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { BrowseStep } from '..';

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

  {
    id: 2,
    createdAt: '',
    pathId: 2,
    name: 'Folder 2',
    children: {
      count: 11,
    },
    files: {
      count: 12,
    },
    updatedAt: '',
    path: '/2',
  },
];

const setup = (
  props = {
    assets: [],
    canCreate: true,
    folders: FIXTURE_FOLDERS,
    onAddAsset: jest.fn(),
    onChangeFilters: jest.fn(),
    onChangePage: jest.fn(),
    onChangePageSize: jest.fn(),
    onChangeSearch: jest.fn(),
    onChangeSort: jest.fn(),
    onChangeFolder: jest.fn(),
    onEditAsset: jest.fn(),
    onSelectAllAsset: jest.fn(),
    onSelectAsset: jest.fn(),
    pagination: { pageCount: 1 },
    queryObject: { page: 1, pageSize: 10 },
    selectedAssets: [],
  }
) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <MemoryRouter>
        <IntlProvider messages={{}} locale="en">
          <BrowseStep {...props} />
        </IntlProvider>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('BrowseStep', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });
});
