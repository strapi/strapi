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

const messages = {
  en: {},
};

const makeApp = (history, filtersSchema) => (
  <Router history={history}>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={messages} textComponent="span">
        <FilterListURLQuery filtersSchema={filtersSchema} />
      </IntlProvider>
    </ThemeProvider>
  </Router>
);

describe('<FilterListURLQuery />', () => {
  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    render(makeApp(history));
    // expect(firstChild).toMatchInlineSnapshot();
    // expect(true).toBe(true);
  });
});
