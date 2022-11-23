import React from 'react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { TableList } from '..';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useQueryParams: jest.fn(() => [{ query: {} }]),
}));

const PROPS_FIXTURE = {
  canUpdate: false,
  rows: [
    {
      alternativeText: 'alternative text',
      createdAt: '2021-10-18T08:04:56.326Z',
      ext: '.jpeg',
      formats: {
        thumbnail: {
          url: '/uploads/thumbnail_3874873_b5818bb250.jpg',
        },
      },
      id: 1,
      mime: 'image/jpeg',
      name: 'michka',
      size: 11.79,
      updatedAt: '2021-10-18T08:04:56.326Z',
      url: '/uploads/michka.jpg',
      type: 'asset',
    },
  ],
  onEditAsset: jest.fn(),
  onEditFolder: jest.fn(),
  onSelectOne: jest.fn(),
  onSelectAll: jest.fn(),
  selected: [],
};

const ComponentFixture = (props) => {
  const customProps = {
    ...PROPS_FIXTURE,
    ...props,
  };

  return (
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <TableList {...customProps} />
        </ThemeProvider>
      </IntlProvider>
    </MemoryRouter>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('TableList', () => {
  it('should render table headers labels', () => {
    const { getByText } = setup();

    expect(getByText('preview')).toBeInTheDocument();
    expect(getByText('name')).toBeInTheDocument();
    expect(getByText('extension')).toBeInTheDocument();
    expect(getByText('size')).toBeInTheDocument();
    expect(getByText('created')).toBeInTheDocument();
    expect(getByText('last update')).toBeInTheDocument();
  });

  it('should render a visually hidden edit table headers label', () => {
    const { getByRole } = setup();

    expect(getByRole('columnheader', { name: 'actions' })).toBeInTheDocument();
  });

  it('should call onChangeSort callback when changing sort order', () => {
    const onChangeSortSpy = jest.fn();
    const { getByRole } = setup({ sortQuery: 'updatedAt:ASC', onChangeSort: onChangeSortSpy });

    const sortButton = getByRole('button', { name: 'Sort on last update' });
    expect(sortButton).toBeInTheDocument();

    fireEvent.click(sortButton);

    expect(onChangeSortSpy).toHaveBeenCalledWith('updatedAt:DESC');
  });

  it('should call onChangeSort callback when changing sort by', () => {
    const onChangeSortSpy = jest.fn();
    const { getByRole } = setup({ sortQuery: 'updatedAt:ASC', onChangeSort: onChangeSortSpy });

    const sortButton = getByRole('button', { name: 'Sort on name' });
    expect(sortButton).toBeInTheDocument();

    fireEvent.click(sortButton);

    expect(onChangeSortSpy).toHaveBeenCalledWith('name:ASC');
  });

  it('should call onSelectAll callback when bulk selecting', () => {
    const onSelectAllSpy = jest.fn();
    const { getByRole } = setup({ onSelectAll: onSelectAllSpy });

    fireEvent.click(getByRole('checkbox', { name: 'Select all folders & assets' }));

    expect(onSelectAllSpy).toHaveBeenCalledTimes(1);
  });

  it('should call disable bulk select when users do not have update persmission', () => {
    const { getByRole } = setup({ canUpdate: false });

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
          id: 2,
          name: 'folder 1',
          type: 'folder',
          updatedAt: '2022-11-17T10:40:06.022Z',
        },
      ],
    });

    expect(getByText('folder 1')).toBeInTheDocument();
  });
});
