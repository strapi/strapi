import React from 'react';

import { render } from '@tests/utils';
import qs from 'qs';

import { FilterListURLQuery } from '../FilterListURLQuery';

describe('FilterListURLQuery', () => {
  it('should render nothing if there is no query', () => {
    const { queryAllByRole } = render(<FilterListURLQuery filtersSchema={[]} />);

    expect(queryAllByRole('button')).toEqual([]);
  });

  it('renders and matches the snapshot', () => {
    const filtersSchema = [
      {
        name: 'bool',
        metadatas: { label: 'Boolean' },
        fieldSchema: { type: 'boolean' },
      },
      {
        name: 'date',
        metadatas: { label: 'Date' },
        fieldSchema: { type: 'date' },
      },
      {
        name: 'enum',
        metadatas: { label: 'enum' },
        fieldSchema: { type: 'enumeration', options: ['one', 'two', 'three'] },
      },
      {
        name: 'long',
        metadatas: { label: 'Long' },
        fieldSchema: { type: 'string' },
      },
      {
        name: 'city',
        metadatas: { label: 'city' },
        fieldSchema: { type: 'string' },
      },
      {
        name: 'country',
        metadatas: { label: 'country' },
        fieldSchema: { type: 'string' },
      },
      {
        name: 'many_to_one',
        metadatas: { label: 'many to one' },
        fieldSchema: {
          type: 'relation',
          mainField: {
            name: 'postal_code',
            schema: { type: 'string', pluginOptions: { i18n: { localized: true } } },
          },
        },
      },
      {
        name: 'number',
        metadatas: { label: 'number' },
        fieldSchema: { type: 'integer' },
      },
      {
        name: 'float',
        metadatas: { label: 'Float' },
        fieldSchema: { type: 'float' },
      },
      {
        name: 'time',
        metadatas: { label: 'time' },
        fieldSchema: { type: 'time' },
      },
    ];

    const search = {
      sort: 'city',
      filters: {
        $and: [
          { bool: { $eq: 'true' } },
          { date: { $ne: '2021-09-01' } },
          { city: { $null: 'true' } },
          { country: { $notNull: 'true' } },
          { time: { $contains: '00:45' } },
          { many_to_one: { postal_code: { $notContains: 'test' } } },
          { many_to_one: { postal_code: { $eq: 'test' } } },
          { city: { $startsWith: 'paris' } },
          { country: { $endsWith: 'france' } },
          { number: { $gt: '2' } },
          { float: { $gte: '1' } },
          { float: { $lte: '3' } },
          { float: { $lt: '4' } },
        ],
      },
    };

    const { getAllByRole } = render(<FilterListURLQuery filtersSchema={filtersSchema} />, {
      initialEntries: [{ pathname: '/', search: qs.stringify(search, { encode: false }) }],
    });

    expect(getAllByRole('button')).toHaveLength(13);
  });

  it('displays the label for a custom input providing options with custom values', () => {
    const displayedFilters = [
      {
        name: 'action',
        metadatas: {
          label: 'Action',
          options: [
            { label: 'Create entry', customValue: 'entry.create' },
            { label: 'Update entry', customValue: 'entry.update' },
            { label: 'Delete entry', customValue: 'entry.delete' },
          ],
          customInput: jest.fn(),
        },
        fieldSchema: { type: 'enumeration' },
      },
    ];
    const search = {
      filters: {
        $and: [
          {
            action: {
              $eq: 'entry.create',
            },
          },
        ],
      },
    };

    const { getByRole } = render(<FilterListURLQuery filtersSchema={displayedFilters} />, {
      initialEntries: [{ pathname: '/', search: qs.stringify(search, { encode: false }) }],
    });

    expect(getByRole('button', { name: /create entry/i })).toBeVisible();
  });
});
