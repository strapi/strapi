import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { LoadingIndicatorPage } from '../LoadingIndicatorPage';

const setup = (children: React.ReactNode) => {
  return render(
    <IntlProvider locale="en" defaultLocale="en">
      <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
    </IntlProvider>
  );
};

describe('LoadingIndicatorPage', () => {
  it('renders with default values', () => {
    setup(<LoadingIndicatorPage />);

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText('Loading content.')).toBeInTheDocument();
  });

  it('renders with custom values', () => {
    setup(<LoadingIndicatorPage data-testid="custom-loader">Custom content.</LoadingIndicatorPage>);

    expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    expect(screen.getByText('Custom content.')).toBeInTheDocument();
  });
});
