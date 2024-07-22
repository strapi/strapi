import { fireEvent, render, waitFor } from '@strapi/strapi/admin/test';
import { rest } from 'msw';

import { server } from '../../../../tests/server';
import { SettingsPage } from '../Settings';

describe('SettingsPage', () => {
  it('renders the setting page correctly', async () => {
    const { getByRole, queryByText, getByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    expect(getByText('Configure the documentation plugin')).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');

    expect(getByRole('checkbox', { name: 'Restricted Access' })).toBeInTheDocument();
  });

  it('should automatically render the password field if the server restricted access property is true', async () => {
    server.use(
      rest.get('*/getInfos', (req, res, ctx) => {
        return res(
          ctx.json({
            documentationAccess: { restrictedAccess: true },
          })
        );
      })
    );

    const { getByLabelText, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByLabelText('Password')).toBeInTheDocument();

    server.restoreHandlers();
  });

  it('should render the password field when the Restricted Access checkbox is checked', async () => {
    const { getByRole, getByLabelText, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    fireEvent.click(getByRole('checkbox', { name: 'Restricted Access' }));

    expect(getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'false');

    expect(getByLabelText('Password')).toBeInTheDocument();
  });

  it('should allow me to type a password and save that settings change successfully', async () => {
    const { getByRole, getByLabelText, queryByText, user, findByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    fireEvent.click(getByRole('checkbox', { name: 'Restricted Access' }));

    expect(getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'false');

    await user.type(getByLabelText('Password'), 'Password123');

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await findByText('Loading content.');

    await findByText('Successfully updated settings');

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());
  });
});
