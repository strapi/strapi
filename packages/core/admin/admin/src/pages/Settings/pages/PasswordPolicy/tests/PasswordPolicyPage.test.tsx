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

const DEFAULT_POLICY = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialCharacter: false,
};

const respondWith = (policy: typeof DEFAULT_POLICY, floor: typeof DEFAULT_POLICY) =>
  server.use(
    http.get('/admin/password-policy', () => HttpResponse.json({ data: policy, meta: { floor } }))
  );
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
      'Must be at least 8 characters, 1 uppercase, 1 lowercase & 1 number'
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

  it('asks for a minimum length when the field is cleared', async () => {
    const { user } = render(<PasswordPolicyPage />, asEditor);

    await screen.findByRole('heading', { name: 'Password policy' });

    await user.clear(screen.getByLabelText(/Minimum length/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('This value is required.')).toBeInTheDocument();
    expect(screen.queryByText(/must be a `number` type/)).not.toBeInTheDocument();
  });

  it('locks the rules the server configuration requires', async () => {
    render(<PasswordPolicyPage />, asEditor);

    await screen.findByRole('heading', { name: 'Password policy' });

    // Without `passwordPolicy` in `config/admin`, the floor is the default policy
    for (const name of [
      /Require a lowercase letter/,
      /Require an uppercase letter/,
      /Require a number/,
    ]) {
      expect(screen.getByRole('checkbox', { name })).toBeDisabled();
    }
    expect(
      screen.getAllByText('Required by the server configuration (passwordPolicy in config/admin)')
    ).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: /Require a special character/ })).toBeEnabled();
  });

  it('lets every rule be changed when the configuration only sets a minimum length', async () => {
    respondWith(
      { ...DEFAULT_POLICY, minLength: 10 },
      {
        minLength: 10,
        requireLowercase: false,
        requireUppercase: false,
        requireNumber: false,
        requireSpecialCharacter: false,
      }
    );
    render(<PasswordPolicyPage />, asEditor);

    await screen.findByRole('heading', { name: 'Password policy' });

    expect(screen.getByRole('checkbox', { name: /Require an uppercase letter/ })).toBeEnabled();
    expect(
      screen.queryByText('Required by the server configuration (passwordPolicy in config/admin)')
    ).not.toBeInTheDocument();
  });

  it('keeps the minimum length above the configured floor', async () => {
    respondWith({ ...DEFAULT_POLICY, minLength: 12 }, { ...DEFAULT_POLICY, minLength: 12 });
    const { user } = render(<PasswordPolicyPage />, asEditor);

    await screen.findByRole('heading', { name: 'Password policy' });
    expect(screen.getByText('Between 12 and 64 characters')).toBeInTheDocument();

    const minLength = screen.getByLabelText(/Minimum length/);
    await user.clear(minLength);
    await user.type(minLength, '10');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The value is too low (min: 12).')).toBeInTheDocument();
  });

  it.each(['', '4', '100'])(
    'only previews a minimum length that can be saved (%s)',
    async (value) => {
      const { user } = render(<PasswordPolicyPage />, asEditor);

      await screen.findByRole('heading', { name: 'Password policy' });

      const minLength = screen.getByLabelText(/Minimum length/);
      await user.clear(minLength);
      if (value) {
        await user.type(minLength, value);
      }

      expect(screen.getByTestId('password-policy-preview')).toHaveTextContent(
        'Enter a valid minimum length to see the hint.'
      );
    }
  );

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
