import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { InternalErrorPage } from '../InternalErrorPage';

const render = (props) =>
  renderRTL(<InternalErrorPage {...props} />, {
    wrapper({ children }) {
      return (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} textComponent="span">
            <MemoryRouter>{children}</MemoryRouter>
          </IntlProvider>
        </ThemeProvider>
      );
    },
  });

describe('InternalErrorPage', () => {
  it('renders', () => {
    const { getByRole, getByText } = render();

    expect(getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(getByText(/an error occured/i)).toBeInTheDocument();
    expect(getByText(/back to homepage/i)).toBeInTheDocument();
  });
});
