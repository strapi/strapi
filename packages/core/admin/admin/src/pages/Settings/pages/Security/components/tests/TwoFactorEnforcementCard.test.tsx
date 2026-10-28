import { within } from '@testing-library/react';
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

/** The blast radius the raise confirmation reads before saving. */
const impact = (affected: number, enrolled: number) => {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get('/admin/security-settings/mfa-impact', ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ data: { affected, enrolled } });
    })
  );
  return queries;
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

  it('keeps Save disabled while isRefreshing, even with a modified draft', async () => {
    const { user } = renderCard({ isRefreshing: true });

    await user.click(screen.getByRole('radio', { name: /^Required/ }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables every control and Save without the update permission', () => {
    renderCard({ canUpdate: false });

    expect(screen.getByRole('radio', { name: /^Required/ })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Editor (3 users)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  /**
   * Raising enforcement can put every password user on a lockout clock. It used to commit on one
   * click with a "Saved" toast; it now shows how many people and how long they have, and only
   * saves once confirmed. No credentials: that gate is for the opposite direction.
   */
  it('confirms a protection increase with its blast radius, then saves without credentials', async () => {
    const bodies = captureSave();
    const queries = impact(12, 5);
    const { user } = renderCard({ callerEnrolled: true });

    await user.click(screen.getByRole('radio', { name: /^Required/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Author (0 users)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Require two-factor authentication?',
    });
    expect(dialog).toHaveTextContent(
      '12 users will be asked to set up two-factor authentication, and 5 of them already have it.'
    );
    expect(dialog).toHaveTextContent('Each has 7 days from their next sign-in');
    expect(queries[0].get('mode')).toBe('required');
    expect(bodies).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      mfa: { mode: 'required', graceDays: 7, requiredRoles: ['2', '3'] },
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('saves nothing when the raise is cancelled', async () => {
    const bodies = captureSave();
    impact(3, 0);
    const { user } = renderCard({ callerEnrolled: true });

    await user.click(screen.getByRole('radio', { name: /^Required/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Require two-factor authentication?',
    });
    expect(dialog).toHaveTextContent(
      '3 users will be asked to set up two-factor authentication, and none of them has it.'
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(bodies).toHaveLength(0);
    // The draft survives, so the user can reconsider without redoing their choices.
    expect(screen.getByRole('radio', { name: /^Required/ })).toBeChecked();
  });

  it('shortening the grace period is not a raise, so it saves without the confirmation', async () => {
    const bodies = captureSave();
    const queries = impact(1, 1);
    const { user } = renderCard();

    const grace = screen.getByRole('spinbutton', { name: 'Grace period (days)' });
    await user.clear(grace);
    await user.type(grace, '3');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(queries).toHaveLength(0);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
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

  /**
   * Requiring two-factor authentication of a caller who has none is the most obvious self-lockout,
   * and the server refuses it. The card used to find out only after Save; it now says so first,
   * with the way forward, and does not offer the click.
   */
  it('says to enrol first, and offers no Save, before an unenrolled caller can require it', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ callerEnrolled: false });

    await user.click(screen.getByRole('radio', { name: /^Required/ }));

    expect(
      screen.getByText(/Set up two-factor authentication on your own account before requiring it/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to your profile' })).toHaveAttribute('href', '/me');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(bodies).toHaveLength(0);
  });

  it('does not apply the guard to a caller with no local password, who is exempt', async () => {
    const { user } = renderCard({ callerEnrolled: false, callerHasLocalPassword: false });

    await user.click(screen.getByRole('radio', { name: /^Required/ }));

    expect(screen.queryByText(/before requiring it for others/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('applies the guard when optional gains a role the caller holds, and not otherwise', async () => {
    const { user } = renderCard({ callerEnrolled: false, callerRoleIds: ['3'] });

    await user.click(screen.getByRole('checkbox', { name: 'Author (0 users)' }));

    expect(screen.getByText(/before requiring it for others/)).toBeInTheDocument();
  });

  /** The server stays the authority, and its refusal reaches the user in their own language. */
  it('shows a server refusal by its code, translated, and keeps the draft', async () => {
    server.use(
      http.put('/admin/security-settings', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Enrol in two-factor authentication before requiring it for others',
              details: { code: 'MFA_ENROL_FIRST' },
            },
          },
          { status: 400 }
        )
      )
    );
    impact(4, 0);
    const { user } = renderCard({ callerEnrolled: true });

    await user.click(screen.getByRole('radio', { name: /^Required/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(
      within(
        await screen.findByRole('alertdialog', { name: 'Require two-factor authentication?' })
      ).getByRole('button', { name: 'Confirm' })
    );

    expect(
      await screen.findByText(
        'Set up two-factor authentication on your own account before requiring it for others.'
      )
    ).toBeInTheDocument();
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

  /**
   * A refetch used to adopt server data unconditionally, throwing away whatever the user was in
   * the middle of choosing -- with no sign anything was lost. It now adopts only when there is
   * nothing unsaved; otherwise the edit survives and the server's version waits for the next load.
   */
  it('keeps an unsaved edit when the settings are refetched underneath it', async () => {
    const { user, rerender } = renderCard();
    await user.click(screen.getByRole('radio', { name: /^Required/ }));

    rerender(
      <TwoFactorEnforcementCard
        settings={{ ...SETTINGS, graceDays: 14 }}
        roles={ROLES}
        canUpdate
        callerEnrolled={false}
      />
    );

    expect(screen.getByRole('radio', { name: /^Required/ })).toBeChecked();
  });

  it('adopts refetched settings when nothing is unsaved', () => {
    const { rerender } = renderCard();

    rerender(
      <TwoFactorEnforcementCard
        settings={{ ...SETTINGS, mode: 'required', graceDays: 14 }}
        roles={ROLES}
        canUpdate
        callerEnrolled={false}
      />
    );

    expect(screen.getByRole('radio', { name: /^Required/ })).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toHaveValue(14);
  });
});
