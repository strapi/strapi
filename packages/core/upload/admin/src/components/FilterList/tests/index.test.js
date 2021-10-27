/**
 *
 * Tests for FilterList
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import FilterList from '../index';

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
      <ThemeProvider theme={lightTheme}>
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
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
