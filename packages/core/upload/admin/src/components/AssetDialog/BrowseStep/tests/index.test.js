import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { BrowseStep } from '..';

const FIXTURE_FOLDERS = [
  {
    id: 1,
    createdAt: '',
    uid: '1',
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
    uid: '2',
    name: 'Folder 2',
    children: {
      count: 11,
    },
    files: {
      count: 12,
    },
    updatedAt: '',
    path: '/1',
  },
];

const ComponentFixture = props => {
  return (
    <ThemeProvider theme={lightTheme}>
      <MemoryRouter>
        <IntlProvider messages={{}} locale="en">
          <BrowseStep
            assets={[]}
            canCreate
            folders={FIXTURE_FOLDERS}
            onAddAsset={jest.fn()}
            onChangeFilters={jest.fn()}
            onChangePage={jest.fn()}
            onChangePageSize={jest.fn()}
            onChangeSearch={jest.fn()}
            onChangeSort={jest.fn()}
            onChangeFolder={jest.fn()}
            onEditAsset={jest.fn()}
            onSelectAllAsset={jest.fn()}
            onSelectAsset={jest.fn()}
            pagination={{ pageCount: 1 }}
            queryObject={{ page: 1, pageSize: 10, filters: { $and: [] } }}
            selectedAssets={[]}
            {...props}
          />
        </IntlProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
};

const setup = props => render(<ComponentFixture {...props} />);

describe('BrowseStep', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders and match snapshot', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
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
});
