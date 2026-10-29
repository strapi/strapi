import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { PasswordPolicyPage, ProtectedPasswordPolicyPage } from '../PasswordPolicyPage';

const permission = (id: number, action: string) => ({
  id,
  action,
  subject: null,
  actionParameters: {},
  properties: {},
  conditions: [],
});

const READ = permission(1, 'admin::password-policy.read');
const UPDATE = permission(2, 'admin::password-policy.update');

const asEditor = { providerOptions: { permissions: () => [READ, UPDATE] } };
const asReader = { providerOptions: { permissions: () => [READ] } };

describe('PasswordPolicyPage', () => {
  it('renders the policy returned by the API', async () => {
    render(<PasswordPolicyPage />, asEditor);

    expect(await screen.findByRole('heading', { name: 'Password policy' })).toBeInTheDocument();

    expect(screen.getByLabelText(/Minimum length/)).toHaveValue('8');
    expect(screen.getByRole('checkbox', { name: /Require a lowercase letter/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Require an uppercase letter/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Require a number/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Require a special character/ })).not.toBeChecked();

    expect(screen.getByTestId('password-policy-preview')).toHaveTextContent(
      'Must be at least 8 characters, 1 lowercase, 1 uppercase, 1 number'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('updates the preview and enables saving when a rule changes', async () => {
    render(<PasswordPolicyPage />, asEditor);

    await screen.findByRole('heading', { name: 'Password policy' });

    fireEvent.click(screen.getByRole('checkbox', { name: /Require a special character/ }));

    expect(screen.getByTestId('password-policy-preview')).toHaveTextContent(
      'Must be at least 8 characters, 1 lowercase, 1 uppercase, 1 number, 1 special character'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('rejects a minimum length outside the allowed bounds before calling the API', async () => {
    const { user } = render(<PasswordPolicyPage />, asEditor);

    await screen.findByRole('heading', { name: 'Password policy' });

    const minLength = screen.getByLabelText(/Minimum length/);
    await user.clear(minLength);
    await user.type(minLength, '4');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The value is too low (min: 8).')).toBeInTheDocument();
  });

  it('saves the policy and notifies the user', async () => {
    let sentBody: unknown;

    server.use(
      http.put('/admin/password-policy', async ({ request }) => {
        sentBody = await request.json();

        return HttpResponse.json({ data: sentBody });
      })
    );

    const { user } = render(<PasswordPolicyPage />, asEditor);

    await screen.findByRole('heading', { name: 'Password policy' });

    const minLength = screen.getByLabelText(/Minimum length/);
    await user.clear(minLength);
    await user.type(minLength, '12');
    fireEvent.click(screen.getByRole('checkbox', { name: /Require a number/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(sentBody).toEqual({
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireNumber: false,
        requireSpecialCharacter: false,
      })
    );
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('is read-only without the update permission', async () => {
    render(<PasswordPolicyPage />, asReader);

    expect(await screen.findByRole('heading', { name: 'Password policy' })).toBeInTheDocument();

    expect(screen.getByLabelText(/Minimum length/)).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Require a special character/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });
});

describe('ProtectedPasswordPolicyPage', () => {
  it('hides the page from users without the read permission', async () => {
    render(<ProtectedPasswordPolicyPage />, { providerOptions: { permissions: () => [] } });

    expect(
      await screen.findByText("You don't have the permissions to access that content")
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Password policy' })).not.toBeInTheDocument();
  });

  it('shows the page to users with the read permission', async () => {
    render(<ProtectedPasswordPolicyPage />, asReader);

    expect(await screen.findByRole('heading', { name: 'Password policy' })).toBeInTheDocument();
  });
});
