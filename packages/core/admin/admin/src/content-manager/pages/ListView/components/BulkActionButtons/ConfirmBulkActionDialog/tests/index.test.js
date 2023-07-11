import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import ConfirmBulkActionDialog from '..';

describe('ConfirmBulkActionDialog', () => {
  const Component = (props) => (
    <ConfirmBulkActionDialog
      isOpen={false}
      onToggleDialog={jest.fn()}
      dialogBody={<div data-testid="dialog-body" />}
      endAction={<div data-testid="end-action" />}
      {...props}
    />
  );

  const render = (props) => ({
    ...renderRTL(<Component {...props} />, {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en">
            {children}
          </IntlProvider>
        </ThemeProvider>
      ),
    }),
  });

  it('should toggle the dialog', () => {
    const { rerender } = render();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<Component isOpen />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-body')).toBeInTheDocument();
    expect(screen.getByTestId('end-action')).toBeInTheDocument();
  });
});
