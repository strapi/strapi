import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import Toolbar from '..';

const setup = () =>
  render(<Toolbar />, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          {children}
        </IntlProvider>
      </ThemeProvider>
    ),
  });

describe('BlocksEditor toolbar', () => {
  it('should render the toolbar', () => {
    setup();

    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });
});
