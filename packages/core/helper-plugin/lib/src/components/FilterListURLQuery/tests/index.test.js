/**
 *
 * Tests for FilterListURLQuery
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import FilterListURLQuery from '../index';

const makeApp = (history, filtersSchema) => (
  <Router history={history}>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider
        locale="en"
        messages={{
          'components.FilterOptions.FILTER_TYPES.$eq': 'is',
          'components.FilterOptions.FILTER_TYPES.$contains': 'contains',
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
        metadatas: { label: 'bool' },
        fieldSchema: { type: 'boolean' },
      },
      {
        name: 'date',
        metadatas: { label: 'date' },
        fieldSchema: { type: 'date' },
      },
      {
        name: 'enum',
        metadatas: { label: 'enum' },
        fieldSchema: { type: 'enumeration', options: ['one', 'two', 'three'] },
      },
      {
        name: 'long',
        metadatas: { label: 'long' },
        fieldSchema: { type: 'string' },
      },
      {
        name: 'many_to_one',
        metadatas: { label: 'many_to_one' },
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
        name: 'time',
        metadatas: { label: 'time' },
        fieldSchema: { type: 'time' },
      },
    ];
    history.push({
      pathname: '/',
      search:
        'sort=city&filters[$and][0][bool][$eq]=true&filters[$and][1][date][$eq]=2021-09-01&filters[$and][2][enum][$eq]=one&filters[$and][3][long][$eq]=test&filters[$and][4][many_to_one][postal_code][$eq]=test&filters[$and][5][number][$eq]=2&filters[$and][6][time][$contains]=00:45',
    });
    const { container } = render(makeApp(history, filtersSchema));

    expect(container).toMatchSnapshot();
  });
});
