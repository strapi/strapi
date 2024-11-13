import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { EmptyOrNoPermissions } from '../EmptyOrNoPermissions';

const setup = (props: object) =>
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
    const { getByText } = setup({ isFiltering: true });

    expect(getByText('There are no elements with the applied filters')).toBeInTheDocument();
  });

  test('canCreate', () => {
    const { getByText } = setup({});

    expect(getByText('Add new assets')).toBeInTheDocument();
  });

  test('isFiltering and canCreate', () => {
    const { queryByText } = setup({ isFiltering: true });

    expect(queryByText('Add new assets')).not.toBeInTheDocument();
  });

  test('canRead and not canCreate', () => {
    const { getByText } = setup({ canCreate: false });

    expect(getByText('Media Library is empty')).toBeInTheDocument();
  });

  test('not canRead', () => {
    const { getByText } = setup({ canRead: false });

    expect(getByText('No permissions to view')).toBeInTheDocument();
  });
});
