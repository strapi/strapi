import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { TwoFactorEnforcementCard } from '../TwoFactorEnforcementCard';

import type { MfaEnforcementSettings } from '../../../../../../../../shared/contracts/security-settings';
import type { AdminRole } from '../../../../../../hooks/useAdminRoles';

const ROLES = [
  { id: 1, name: 'Super Admin', code: 'strapi-super-admin', usersCount: 1 },
  { id: 2, name: 'Editor', code: 'strapi-editor', usersCount: 3 },
  { id: 3, name: 'Author', code: 'strapi-author', usersCount: 0 },
] as unknown as AdminRole[];

const SETTINGS: MfaEnforcementSettings = { mode: 'optional', graceDays: 7, requiredRoles: ['2'] };

const renderCard = (props: Partial<React.ComponentProps<typeof TwoFactorEnforcementCard>> = {}) =>
  render(
    <TwoFactorEnforcementCard
      settings={SETTINGS}
      roles={ROLES}
      canUpdate
      callerEnrolled={false}
      {...props}
    />
  );

/** Captures the PUT body and answers with the stored result the server would return. */
const captureSave = () => {
  const bodies: unknown[] = [];
  server.use(
    http.put('/admin/security-settings', async ({ request }) => {
      const body = (await request.json()) as { mfa: MfaEnforcementSettings };
      bodies.push(body);
      return HttpResponse.json({ data: { mfa: body.mfa } });
    })
  );
  return bodies;
};

describe('TwoFactorEnforcementCard', () => {
  it('renders the stored mode, grace days and required roles with user counts', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Optional/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Off/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^Required/ })).not.toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toHaveValue(7);
    expect(screen.getByRole('checkbox', { name: 'Editor (3 users)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Super Admin (1 user)' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Author (0 users)' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables every control and Save without the update permission', () => {
    renderCard({ canUpdate: false });

    expect(screen.getByRole('radio', { name: /^Required/ })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Editor (3 users)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves a protection increase directly, without asking for credentials', async () => {
    const bodies = captureSave();
    const { user } = renderCard();

    await user.click(screen.getByRole('radio', { name: /^Required/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Author (0 users)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      mfa: { mode: 'required', graceDays: 7, requiredRoles: ['2', '3'] },
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('asks for the password alone on a downgrade when the caller is not enrolled, then saves with it', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ callerEnrolled: false });

    await user.click(screen.getByRole('radio', { name: /^Off/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Confirm lowering two-factor requirements',
    });
    expect(bodies).toHaveLength(0);
    expect(dialog).not.toHaveTextContent('Authentication code');
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      mfa: { mode: 'off', graceDays: 7, requiredRoles: ['2'] },
      password: 'Testing123!',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('asks for the password and a code on a downgrade when the caller is enrolled', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ callerEnrolled: true });

    // lengthening the grace period is a downgrade too
    const grace = screen.getByRole('spinbutton', { name: 'Grace period (days)' });
    await user.clear(grace);
    await user.type(grace, '30');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByRole('dialog', { name: 'Confirm lowering two-factor requirements' });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      mfa: { mode: 'optional', graceDays: 30, requiredRoles: ['2'] },
      password: 'Testing123!',
      code: '123456',
    });
  });

  it('keeps the dialog open and shows the server message when the credentials are refused', async () => {
    server.use(
      http.put('/admin/security-settings', () =>
        HttpResponse.json(
          { error: { status: 400, name: 'ValidationError', message: 'Invalid credentials' } },
          { status: 400 }
        )
      )
    );
    const { user } = renderCard({ callerEnrolled: true });

    await user.click(screen.getByRole('radio', { name: /^Off/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '000000');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    // The design system's permanent `#live-region-alert` node always carries `role="alert"`,
    // even empty, so a bare `findByRole('alert')` resolves to it immediately instead of waiting
    // for the real one (same caveat documented in `ConfirmDowngradeDialog.test.tsx`) -- assert on
    // text instead.
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the guard refusal inline under the mode options', async () => {
    server.use(
      http.put('/admin/security-settings', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Enrol in two-factor authentication before requiring it for others',
            },
          },
          { status: 400 }
        )
      )
    );
    const { user } = renderCard();

    await user.click(screen.getByRole('radio', { name: /^Required/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // same live-region caveat as above -- assert on text rather than a bare role query
    expect(
      await screen.findByText('Enrol in two-factor authentication before requiring it for others')
    ).toBeInTheDocument();
    // the draft is kept so the user can change their mind without redoing every click
    expect(screen.getByRole('radio', { name: /^Required/ })).toBeChecked();
  });

  it('refuses to save an out-of-range grace period client-side', async () => {
    const bodies = captureSave();
    const { user } = renderCard();

    const grace = screen.getByRole('spinbutton', { name: 'Grace period (days)' });
    await user.clear(grace);
    await user.type(grace, '31');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Enter a whole number of days between 1 and 30')
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('explains that the role list is inert under Required', async () => {
    const { user } = renderCard();

    await user.click(screen.getByRole('radio', { name: /^Required/ }));

    expect(
      screen.getByText(/Under Required, every user with a password must enrol/)
    ).toBeInTheDocument();
  });
});
