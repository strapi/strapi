import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { PasskeysCard } from '../PasskeysCard';

import type { PasskeySettings } from '../../../../../../../../shared/contracts/security-settings';

const SETTINGS: PasskeySettings = { enabled: true };

const renderCard = (props: Partial<React.ComponentProps<typeof PasskeysCard>> = {}) =>
  render(<PasskeysCard settings={SETTINGS} canUpdate callerEnrolled={false} {...props} />);

/** Captures the PUT body and answers with the whole document the server would return. */
const captureSave = () => {
  const bodies: unknown[] = [];
  server.use(
    http.put('/admin/security-settings', async ({ request }) => {
      const body = (await request.json()) as { passkeys: PasskeySettings };
      bodies.push(body);
      return HttpResponse.json({
        data: {
          mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] },
          trustedDevices: { enabled: true, days: 30 },
          passkeys: body.passkeys,
        },
      });
    })
  );
  return bodies;
};

const enabledBox = () =>
  screen.getByRole('checkbox', { name: 'Allow users to sign in with a passkey' });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('PasskeysCard', () => {
  it('renders the stored policy as its own region, with Save disabled', () => {
    renderCard();

    expect(screen.getByRole('region', { name: 'Passkeys' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Passkeys', level: 2 })).toBeInTheDocument();
    expect(enabledBox()).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables the checkbox and Save without the update permission', () => {
    renderCard({ canUpdate: false });

    expect(enabledBox()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('turning passkeys on saves directly, sending only the passkeys object', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ settings: { enabled: false } });

    await user.click(enabledBox());
    save();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ passkeys: { enabled: true } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('turning passkeys off asks for the password alone when the caller is not enrolled', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ callerEnrolled: false });

    await user.click(enabledBox());
    save();

    const dialog = await screen.findByRole('dialog', { name: 'Turn passkeys off?' });
    expect(dialog).toHaveTextContent(
      'Turning passkeys off deletes every passkey your users have registered.'
    );
    expect(bodies).toHaveLength(0);
    expect(dialog).not.toHaveTextContent('Authentication code');
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ passkeys: { enabled: false }, password: 'Testing123!' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('turning passkeys off asks for the password and a code when the caller is enrolled', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ callerEnrolled: true });

    await user.click(enabledBox());
    save();

    await screen.findByRole('dialog', { name: 'Turn passkeys off?' });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      passkeys: { enabled: false },
      password: 'Testing123!',
      code: '123456',
    });
  });

  it('shows a server refusal inline', async () => {
    server.use(
      http.put('/admin/security-settings', () =>
        HttpResponse.json(
          { error: { status: 400, name: 'ValidationError', message: 'Nope', details: {} } },
          { status: 400 }
        )
      )
    );
    const { user } = renderCard({ settings: { enabled: false } });

    await user.click(enabledBox());
    save();

    expect(await screen.findByText('Nope')).toBeInTheDocument();
  });

  it('re-enables Save only while the draft differs from the stored policy', async () => {
    const { user } = renderCard();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(enabledBox());
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await user.click(enabledBox());
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  // Fix-wave (final review finding 1): the server exempts a passkeys-only save from a
  // password-less (SSO-only) actor's no-local-password refusal, but the pre-fix UI routed the
  // off-transition through `ConfirmDowngradeDialog` unconditionally, whose Confirm demands a
  // password such an actor cannot supply -- a dead end. `hasLocalPassword` closes that gap.
  it('lets a password-less administrator turn passkeys off directly, with no dialog', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ hasLocalPassword: false });

    await user.click(enabledBox());
    save();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ passkeys: { enabled: false } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('still asks a password-holding administrator for credentials, explicitly', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ hasLocalPassword: true, callerEnrolled: false });

    await user.click(enabledBox());
    save();

    await screen.findByRole('dialog', { name: 'Turn passkeys off?' });
    expect(bodies).toHaveLength(0);
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ passkeys: { enabled: false }, password: 'Testing123!' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
