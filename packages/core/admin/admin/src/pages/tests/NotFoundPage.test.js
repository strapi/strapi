import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import { NotFoundPage } from '../NotFoundPage';

const render = (props) =>
  renderRTL(<NotFoundPage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory();

      return (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} textComponent="span">
            <Router history={history}>{children}</Router>
          </IntlProvider>
        </ThemeProvider>
      );
    },
  });

describe('NotFoundPage', () => {
  it('renders', () => {
    const { getByRole, getByText } = render();

    expect(getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(
      getByText("Oops! We can't seem to find the page you're looging for...")
    ).toBeInTheDocument();
    expect(getByText(/back to homepage/i)).toBeInTheDocument();
  });
});
