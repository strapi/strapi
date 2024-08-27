import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { TableList, TableListProps } from '../index';

const PROPS_FIXTURE = {
  canUpdate: true,
  indeterminate: false,
  rows: [
    {
      alternativeText: 'alternative text',
      createdAt: '2021-10-18T08:04:56.326Z',
      ext: '.jpeg',
      formats: {
        thumbnail: {
          url: '/uploads/thumbnail_3874873_b5818bb250.jpg',
          name: 'thumbnail_3874873.jpg',
          hash: 'thumbnail_3874873_b5818bb250',
          ext: '.jpg',
          mime: 'image/jpeg',
          width: 156,
          height: 156,
          size: 3.97,
          sizeInBytes: 397,
          path: null,
        },
      },
      id: 1,
      mime: 'image/jpeg',
      name: 'michka',
      size: 11.79,
      sizeInBytes: 1179,
      updatedAt: '2021-10-18T08:04:56.326Z',
      url: '/uploads/michka.jpg',
      type: 'asset',
      folder: null,
      folderPath: '/1',
      documentId: 'docId',
      hash: 'hash',
      locale: 'en',
      provider: 'local',
    },
  ],
  onEditAsset: jest.fn(),
  onEditFolder: jest.fn(),
  onSelectOne: jest.fn(),
  onSelectAll: jest.fn(),
  selected: [],
  sortQuery: 'updatedAt:ASC',
};

const ComponentFixture = (props: Partial<TableListProps> = {}) => {
  const customProps: TableListProps = {
    ...PROPS_FIXTURE,
    ...props,
  };

  return (
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider>
          <TableList {...customProps} />
        </DesignSystemProvider>
      </IntlProvider>
    </MemoryRouter>
  );
};

const setup = (props: Partial<TableListProps> = {}) => render(<ComponentFixture {...props} />);

describe('TableList', () => {
  it('should render a visually hidden edit table headers label', () => {
    const { getByRole } = setup();

    expect(getByRole('gridcell', { name: 'actions' })).toBeInTheDocument();
  });

  it('should call onChangeSort callback when changing sort order', async () => {
    const onChangeSortSpy = jest.fn();
    const { findByRole } = setup({
      sortQuery: 'updatedAt:ASC',
      onChangeSort: onChangeSortSpy,
    });

    const sortButton = await findByRole('button', { name: 'Sort on last update' });
    expect(sortButton).toBeInTheDocument();

    fireEvent.click(sortButton);

    expect(onChangeSortSpy).toHaveBeenCalledWith('updatedAt:DESC');
  });

  it('should call onChangeSort callback when changing sort by', async () => {
    const onChangeSortSpy = jest.fn();
    const { getByText } = setup({ sortQuery: 'updatedAt:ASC', onChangeSort: onChangeSortSpy });

    expect(getByText('name')).toBeInTheDocument();

    fireEvent.click(getByText('name'));

    expect(onChangeSortSpy).toHaveBeenCalledWith('name:ASC');
  });

  it('should display indeterminate state of bulk select checkbox', () => {
    const { getByRole } = setup({ indeterminate: true });

    expect(getByRole('checkbox', { name: 'Select all folders & assets' })).toBePartiallyChecked();
  });

  it('should not display indeterminate state of bulk select checkbox if checkbox is disabled', () => {
    const { getByRole } = setup({ indeterminate: true, shouldDisableBulkSelect: true });

    expect(
      getByRole('checkbox', { name: 'Select all folders & assets' })
    ).not.toBePartiallyChecked();
  });

  it('should disable bulk select when users do not have update permissions', () => {
    const { getByRole } = setup({ shouldDisableBulkSelect: true });

    expect(getByRole('checkbox', { name: 'Select all folders & assets' })).toBeDisabled();
  });

  it('should render assets', () => {
    const { getByText } = setup();

    expect(getByText('michka')).toBeInTheDocument();
    expect(getByText('JPEG')).toBeInTheDocument();
  });

  it('should render folders', () => {
    const { getByText } = setup({
      rows: [
        {
          createdAt: '2022-11-17T10:40:06.022Z',
          documentId: 'folderId',
          folderURL: '/folder/1',
          isSelectable: true,
          locale: 'en',
          id: 2,
          name: 'folder 1',
          path: '/1',
          pathId: 1,
          type: 'folder',
          updatedAt: '2022-11-17T10:40:06.022Z',
          publishedAt: '2022-11-17T10:40:06.022Z',
          children: {
            count: 0,
          },
          files: {
            count: 0,
          },
        },
      ],
    });

    expect(getByText('folder 1')).toBeInTheDocument();
  });
});
