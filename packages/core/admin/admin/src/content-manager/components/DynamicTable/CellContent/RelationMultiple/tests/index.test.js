import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';

import { axiosInstance } from '../../../../../../core/utils';
import RelationMultiple from '../index';

jest.spyOn(axiosInstance, 'get').mockResolvedValue({
  data: {
    results: [
      {
        id: 1,
        name: 'Relation entity 1',
      },
    ],

    pagination: {
      total: 1,
    },
  },
});

const DEFAULT_PROPS_FIXTURE = {
  contentType: {
    uid: 'api::address.address',
  },
  fieldSchema: {
    type: 'relation',
    relation: 'manyToMany',
    target: 'api::category.category',
  },
  metadatas: {
    mainField: {
      name: 'name',
      schema: {
        type: 'string',
      },
    },
  },
  value: {
    count: 1,
  },
  name: 'categories.name',
  rowId: 1,
};

const ComponentFixture = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <RelationMultiple {...DEFAULT_PROPS_FIXTURE} />
        </IntlProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('DynamicTabe / Cellcontent / RelationMultiple', () => {
  it('renders and matches the snapshot', async () => {
    const { container } = render(<ComponentFixture />);
    expect(container).toMatchSnapshot();
    expect(axiosInstance.get).toHaveBeenCalledTimes(0);
  });

  it('fetches relation entities once the menu is opened', async () => {
    const { container } = render(<ComponentFixture />);
    const button = container.querySelector('[type=button]');

    fireEvent(button, new MouseEvent('mousedown', { bubbles: true }));

    expect(screen.getByText('Relations are loading')).toBeInTheDocument();
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Relation entity 1')).toBeInTheDocument());
  });
});
