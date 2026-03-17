// TODO: find a better naming convention for the file that was an index file before
/**
 *
 * Tests for FilterList
 *
 */
import { DesignSystemProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { FilterList } from '../FilterList';

const messages = {
  'components.FilterOptions.FILTER_TYPES.$eq': 'is',
  'components.FilterOptions.FILTER_TYPES.$ne': 'is not',
  'components.FilterOptions.FILTER_TYPES.$contains': 'contains (case sensitive)',
  'components.FilterOptions.FILTER_TYPES.$notContains': 'does not contain (case sensitive)',
  'components.FilterOptions.FILTER_TYPES.$gt': 'is greater than',
  'components.FilterOptions.FILTER_TYPES.$gte': 'is greater than or equal to',
  'components.FilterOptions.FILTER_TYPES.$lt': 'is lower than',
  'components.FilterOptions.FILTER_TYPES.$lte': 'is lower than or equal to',
  'components.FilterOptions.FILTER_TYPES.$startsWith': 'starts with',
  'components.FilterOptions.FILTER_TYPES.$endsWith': 'ends with',
  'components.FilterOptions.FILTER_TYPES.$null': 'is null',
  'components.FilterOptions.FILTER_TYPES.$notNull': 'is not null',
};

describe('<FilterList />', () => {
  const filtersSchema = [
    {
      name: 'createdAt',
      fieldSchema: {
        type: 'date',
      },
      metadatas: { label: 'createdAt' },
    },
    {
      name: 'updatedAt',
      fieldSchema: {
        type: 'date',
      },
      metadatas: { label: 'updatedAt' },
    },
    {
      name: 'mime',
      fieldSchema: {
        type: 'enumeration',
        options: [
          { label: 'image', value: 'image' },
          { label: 'video', value: 'video' },
          { label: 'file', value: 'file' },
        ],
      },
      metadatas: { label: 'type' },
    },
  ];

  it('renders and matches the snapshot', () => {
    const filters = [
      { mime: { $contains: 'image' } },
      { mime: { $notContains: 'image' } },
      { createdAt: { $eq: '2021-10-07' } },
      { mime: { $contains: 'video' } },
      {
        mime: {
          $not: {
            $contains: {
              0: 'image',
              1: 'video',
            },
          },
        },
      },
      {
        mime: {
          $contains: {
            0: 'image',
            1: 'video',
          },
        },
      },
    ];

    const { container } = render(
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <FilterList
            appliedFilters={filters}
            filtersSchema={[
              {
                name: 'createdAt',
                fieldSchema: {
                  type: 'date',
                },
                metadatas: { label: 'createdAt' },
              },
              {
                name: 'updatedAt',
                fieldSchema: {
                  type: 'date',
                },
                metadatas: { label: 'updatedAt' },
              },
              {
                name: 'mime',
                fieldSchema: {
                  type: 'enumeration',
                  options: [
                    { label: 'image', value: 'image' },
                    { label: 'video', value: 'video' },
                    { label: 'file', value: 'file' },
                  ],
                },
                metadatas: { label: 'type' },
              },
            ]}
            onRemoveFilter={jest.fn()}
          />
        </IntlProvider>
      </DesignSystemProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('removes file type filter when clicking on it', async () => {
    const user = userEvent.setup();
    const onRemoveFilter = jest.fn();

    // The file type filter uses a complex object structure
    const fileFilter = {
      mime: {
        $not: {
          $contains: ['image', 'video'],
        },
      },
    };

    const filters = [fileFilter];

    render(
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <FilterList
            appliedFilters={filters}
            filtersSchema={filtersSchema}
            onRemoveFilter={onRemoveFilter}
          />
        </IntlProvider>
      </DesignSystemProvider>
    );

    expect(screen.getByText(/type is file/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button'));

    expect(onRemoveFilter).toHaveBeenCalledWith([]);
  });

  it('removes file type filter with $ne operator when clicking on it', async () => {
    const user = userEvent.setup();
    const onRemoveFilter = jest.fn();

    // The "is not file" filter uses $contains with array
    const notFileFilter = {
      mime: {
        $contains: ['image', 'video'],
      },
    };

    const filters = [notFileFilter];

    render(
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <FilterList
            appliedFilters={filters}
            filtersSchema={filtersSchema}
            onRemoveFilter={onRemoveFilter}
          />
        </IntlProvider>
      </DesignSystemProvider>
    );

    expect(screen.getByText(/type is not file/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button'));

    expect(onRemoveFilter).toHaveBeenCalledWith([]);
  });
});
