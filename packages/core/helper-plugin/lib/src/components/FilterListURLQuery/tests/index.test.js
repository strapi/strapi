/**
 *
 * Tests for FilterListURLQuery
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import qs from 'qs';
import FilterListURLQuery from '../index';

const makeApp = (history, filtersSchema) => (
  <Router history={history}>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider
        locale="en"
        messages={{
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
        }}
        defaultLocale="en"
        textComponent="span"
      >
        <FilterListURLQuery filtersSchema={filtersSchema} />
      </IntlProvider>
    </ThemeProvider>
  </Router>
);

describe('<FilterListURLQuery />', () => {
  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
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
    history.push({
      pathname: '/',
      search: qs.stringify(search, { encode: false }),
    });

    const { container } = render(makeApp(history, filtersSchema));

    expect(container).toMatchSnapshot();
  });
});
