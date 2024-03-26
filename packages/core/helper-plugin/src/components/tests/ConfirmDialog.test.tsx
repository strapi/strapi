import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ConfirmDialog, ConfirmDialogProps } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const render = (props?: Partial<ConfirmDialogProps>) => ({
    ...renderRTL(
      <ConfirmDialog
        isOpen
        onConfirm={jest.fn()}
        onToggleDialog={jest.fn()}
        bodyText={{
          id: 'app.components',
          defaultMessage: 'Are you sure you want to unpublish it?',
        }}
        title={{ id: 'app.components.ConfirmDialog.title', defaultMessage: 'Confirmation' }}
        {...props}
      />,
      {
        wrapper: ({ children }) => (
          <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en" messages={{}} defaultLocale="en">
              {children}
            </IntlProvider>
          </ThemeProvider>
        ),
      }
    ),
    user: userEvent.setup(),
  });

  it('renders with given props and displays open dialog', async () => {
    render();

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to unpublish it?')).toBeInTheDocument();
    });

    expect(screen.getByText('Confirmation')).toBeInTheDocument();

    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('verifies dialog is hidden when isOpen is false', () => {
    render({ isOpen: false });

    expect(screen.queryByText('Confirmation')).not.toBeInTheDocument();
  });

  it('triggers onConfirm when confirm button is clicked', async () => {
    const onConfirm = jest.fn();
    const { user } = render({ onConfirm });

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toBeCalled();
  });

  it('triggers onToggleDialog when "Cancel" button is clicked', async () => {
    const onToggleDialog = jest.fn();
    const { user } = render({ onToggleDialog });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onToggleDialog).toBeCalled();
  });

  it('renders component parts and matches text', async () => {
    const { rerender } = render();
    rerender(
      <ConfirmDialog.Root isOpen onToggleDialog={jest.fn()} onConfirm={jest.fn()}>
        <ConfirmDialog.Body>Are you sure you want to unpublish it?</ConfirmDialog.Body>
      </ConfirmDialog.Root>
    );

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to unpublish it?')).toBeInTheDocument();
    });
    expect(screen.getByText('Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });
});
