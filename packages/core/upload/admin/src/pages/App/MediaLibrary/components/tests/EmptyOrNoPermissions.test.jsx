import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { EmptyOrNoPermissions } from '../EmptyOrNoPermissions';

const setup = (props) =>
  render(
    <DesignSystemProvider>
      <IntlProvider locale="en" messages={{}}>
        <EmptyOrNoPermissions
          onActionClick={() => {}}
          isFiltering={false}
          canCreate
          canRead
          {...props}
        />
      </IntlProvider>
    </DesignSystemProvider>
  );

describe('EmptyOrNoPermissions', () => {
  test('isFiltering', () => {
    const { queryByText } = setup({ isFiltering: true });

    expect(queryByText('There are no elements with the applied filters')).toBeInTheDocument();
  });

  test('canCreate', () => {
    const { queryByText } = setup({});

    expect(queryByText('Add new assets')).toBeInTheDocument();
  });

  test('isFiltering and canCreate', () => {
    const { queryByText } = setup({ isFiltering: true });

    expect(queryByText('Add new assets')).not.toBeInTheDocument();
  });

  test('canRead and not canCreate', () => {
    const { queryByText } = setup({ canCreate: false });

    expect(queryByText('Media Library is empty')).toBeInTheDocument();
  });

  test('not canRead', () => {
    const { queryByText } = setup({ canRead: false });

    expect(queryByText('No permissions to view')).toBeInTheDocument();
  });
});
