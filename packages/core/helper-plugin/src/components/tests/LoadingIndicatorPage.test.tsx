import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { LoadingIndicatorPage } from '../LoadingIndicatorPage';

const setup = (props = {}) => {
  return render(
    <IntlProvider locale="en" defaultLocale="en">
      <ThemeProvider theme={lightTheme}>
        <LoadingIndicatorPage {...props} />
      </ThemeProvider>
    </IntlProvider>
  );
};

describe('LoadingIndicatorPage', () => {
  it('renders with default values', () => {
    setup();

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText('Loading content.')).toBeInTheDocument();
  });

  it('renders with custom values', () => {
    setup({ children: 'Custom content.' });

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText('Custom content.')).toBeInTheDocument();
  });
});
