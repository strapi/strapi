import { within } from '@testing-library/react';
import { initialState } from '@tests/store';
import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Link } from 'react-router-dom';

import { SecurityPage } from '../SecurityPage';

import type { SecuritySettings } from '../../../../../../../shared/contracts/security-settings';
import type { Permission } from '../../../../../features/Auth';

const STORED: SecuritySettings = {
  mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1'] },
  trustedDevices: { enabled: true, days: 30 },
  passkeys: { enabled: true },
};

const settings = (overrides: Partial<SecuritySettings> = {}) =>
  http.get('/admin/security-settings', () =>
    HttpResponse.json({ data: { ...STORED, ...overrides } })
  );

const me = (enabled: boolean, hasLocalPassword = true) =>
  http.get('/admin/mfa/me', () =>
    HttpResponse.json({
      data: {
        enabled,
        enabledAt: enabled ? '2026-09-01T10:14:00.000Z' : null,
        recoveryCodesRemaining: enabled ? 10 : 0,
        codesAcknowledged: enabled,
        required: false,
        graceUntil: null,
        trustedDevicesEnabled: true,
        hasLocalPassword,
      },
    })
  );

/** Captures each PUT body and answers with the stored result the server would return. */
const captureSave = () => {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.put('/admin/security-settings', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      return HttpResponse.json({ data: { ...STORED, ...body } });
    })
  );
  return bodies;
};

const passkeysImpact = (count: number) =>
  server.use(
    http.get('/admin/security-settings/passkeys-impact', () =>
      HttpResponse.json({ data: { count } })
    )
  );

const mfaImpact = (affected: number, enrolled: number) =>
  server.use(
    http.get('/admin/security-settings/mfa-impact', () =>
      HttpResponse.json({ data: { affected, enrolled } })
    )
  );

/**
 * The shared fixtures grant `admin::security-settings.*`, but their redux permission map has no
 * `settings.security` entry, so the page would check nothing. The entry is wired in here;
 * `canUpdate: false` takes the update grant away.
 */
const withSecurityPermissions = ({ canUpdate }: { canUpdate: boolean }) => {
  const preloadedState = initialState();
  preloadedState.admin_app.permissions = {
    ...preloadedState.admin_app.permissions,
    settings: {
      ...preloadedState.admin_app.permissions.settings,
      security: {
        main: [{ action: 'admin::security-settings.read', subject: null }],
        read: [{ action: 'admin::security-settings.read', subject: null }],
        update: [{ action: 'admin::security-settings.update', subject: null }],
      },
    } as typeof preloadedState.admin_app.permissions.settings,
  };

  return {
    storeConfig: { preloadedState },
    permissions: (defaults: Permission[]) =>
      canUpdate ? defaults : defaults.filter((p) => p.action !== 'admin::security-settings.update'),
  };
};

const renderPage = async (...handlers: Parameters<typeof server.use>) => {
  server.use(...handlers);
  const utils = render(
    <>
      <SecurityPage />
      <Link to="/elsewhere">Leave</Link>
    </>,
    { providerOptions: withSecurityPermissions({ canUpdate: true }) }
  );
  await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
  // `canUpdate` resolves after the first paint, so wait until the controls are live
  await waitFor(() =>
    expect(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    ).toBeEnabled()
  );
  return utils;
};

const saveButton = () => screen.getByRole('button', { name: 'Save' });

const chooseMode = async (user: ReturnType<typeof render>['user'], label: string) => {
  await user.click(screen.getByRole('combobox', { name: 'Requirement' }));
  await user.click(screen.getByRole('option', { name: label }));
};

describe('SecurityPage', () => {
  it('renders the three cards and one Save, in the header, disabled until something changes', async () => {
    await renderPage(settings(), me(true));

    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Two-factor authentication', 'Trusted devices', 'Passkeys']);

    expect(screen.getAllByRole('button', { name: 'Save' })).toHaveLength(1);
    ['Two-factor authentication', 'Trusted devices', 'Passkeys'].forEach((name) => {
      expect(
        within(screen.getByRole('region', { name })).queryByRole('button', { name: 'Save' })
      ).not.toBeInTheDocument();
    });
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Requirement' })).toHaveTextContent(
      'Required for selected roles'
    );
  });

  it('keeps showing the loading state, not an empty card, while /admin/roles is still in flight', async () => {
    server.use(
      settings(),
      me(true),
      http.get('/admin/roles', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({
          data: [
            { id: 1, code: 'strapi-editor', name: 'Editor' },
            { id: 2, code: 'strapi-author', name: 'Author' },
          ],
        });
      })
    );
    render(<SecurityPage />);

    // The settings query (and RBAC) can resolve well before the roles query even starts; the
    // card must stay hidden behind Page.Loading for that whole stretch rather than flashing with
    // an empty role list.
    expect(screen.getByText('Loading content.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Two-factor authentication' })
    ).not.toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
  });

  it('shows the disabled-feature state when the API answers 404', async () => {
    server.use(
      http.get('/admin/security-settings', () => new HttpResponse(null, { status: 404 })),
      http.get('/admin/mfa/me', () => new HttpResponse(null, { status: 404 }))
    );
    render(<SecurityPage />);

    expect(
      await screen.findByText(/Two-factor authentication is turned off on this instance/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('renders Page.Error, not the disabled-feature copy, when the API answers 500', async () => {
    server.use(
      http.get('/admin/security-settings', () =>
        HttpResponse.json(
          { error: { status: 500, name: 'InternalServerError', message: 'boom' } },
          { status: 500 }
        )
      ),
      me(false)
    );
    render(<SecurityPage />);

    expect(
      await screen.findByText('Whoops! Something went wrong. Please, try again.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Two-factor authentication is turned off on this instance/)
    ).not.toBeInTheDocument();
  });

  it('renders read-only for a user with read but not update permission', async () => {
    server.use(settings(), me(false));
    render(<SecurityPage />, { providerOptions: withSecurityPermissions({ canUpdate: false }) });

    const select = await screen.findByRole('combobox', { name: 'Requirement' });
    expect(select).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Trust period (days)' })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    ).toBeDisabled();
    expect(saveButton()).toBeDisabled();
  });

  it('saves changes to several cards with one request carrying only the changed objects', async () => {
    const bodies = captureSave();
    const { user } = await renderPage(settings({ passkeys: { enabled: false } }), me(true));

    const days = screen.getByRole('spinbutton', { name: 'Trust period (days)' });
    await user.clear(days);
    await user.type(days, '7');
    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    fireEvent.click(saveButton());

    await waitFor(() => expect(bodies).toHaveLength(1));
    // shortening trust and turning passkeys on are no downgrade: no dialog, no credentials
    expect(bodies[0]).toEqual({
      trustedDevices: { enabled: true, days: 7 },
      passkeys: { enabled: true },
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Security settings saved.')).toBeInTheDocument();
  });

  it('asks once for credentials when a save combines several downgrades', async () => {
    const bodies = captureSave();
    passkeysImpact(4);
    const { user } = await renderPage(settings(), me(true));

    await chooseMode(user, 'Not required');
    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', { name: 'Lower security settings?' });
    expect(dialog).toHaveTextContent(
      'Two-factor authentication will no longer be required for Editor.'
    );
    expect(
      await within(dialog).findByText(
        'This deletes all 4 passkeys your users registered. This cannot be undone.'
      )
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Confirm your password and a code to continue.');
    expect(bodies).toHaveLength(0);

    await user.type(within(dialog).getByLabelText('Current password*'), 'Testing123!');
    await user.type(within(dialog).getByLabelText('Authentication code*'), '123456');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      mfa: { mode: 'off', graceDays: 7, requiredRoles: ['1'] },
      passkeys: { enabled: false },
      password: 'Testing123!',
      code: '123456',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('names each change in the combined dialog: roles, mode, grace and trust periods', async () => {
    passkeysImpact(3);
    const { user } = await renderPage(
      settings({ mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1', '2'] } }),
      me(true)
    );

    // Drop both roles' requirement by choosing "Not required", lengthen trust, and turn passkeys off.
    await chooseMode(user, 'Not required');
    const days = screen.getByRole('spinbutton', { name: 'Trust period (days)' });
    await user.clear(days);
    await user.type(days, '60');
    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', { name: 'Lower security settings?' });
    expect(dialog).toHaveTextContent(
      'Two-factor authentication will no longer be required for Editor and Author.'
    );
    expect(dialog).toHaveTextContent(
      'Trusted devices will skip the code for 60 days instead of 30.'
    );
    expect(
      await within(dialog).findByText(
        'This deletes all 3 passkeys your users registered. This cannot be undone.'
      )
    ).toBeInTheDocument();
  });

  it('says "no longer required for everyone" and names a longer grace period', async () => {
    passkeysImpact(1);
    const { user } = await renderPage(
      // Role flags are kept under "Required for everyone", so the draft already selects Editor.
      settings({ mfa: { mode: 'required', graceDays: 7, requiredRoles: ['1'] } }),
      me(true)
    );

    await chooseMode(user, 'Required for selected roles');
    const grace = screen.getByRole('spinbutton', { name: 'Grace period (days)' });
    await user.clear(grace);
    await user.type(grace, '14');
    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', { name: 'Lower security settings?' });
    expect(dialog).toHaveTextContent(
      'Two-factor authentication will no longer be required for everyone.'
    );
    expect(dialog).toHaveTextContent(
      'Users will have 14 days instead of 7 to set up two-factor authentication.'
    );
    expect(
      await within(dialog).findByText(
        'This deletes 1 passkey your users registered. This cannot be undone.'
      )
    ).toBeInTheDocument();
  });

  it('uses the lowering copy, and asks for the password alone, when the caller is not enrolled', async () => {
    const bodies = captureSave();
    const { user } = await renderPage(settings(), me(false));

    const grace = screen.getByRole('spinbutton', { name: 'Grace period (days)' });
    await user.clear(grace);
    await user.type(grace, '30');
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', { name: 'Lower two-factor requirements?' });
    expect(dialog).toHaveTextContent('Confirm your password to continue.');
    expect(within(dialog).queryByLabelText('Authentication code*')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Current password*'), 'Testing123!');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lower requirements' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      mfa: { mode: 'optional', graceDays: 30, requiredRoles: ['1'] },
      password: 'Testing123!',
    });
  });

  it('uses the trust-period copy when lengthening trust is the only downgrade', async () => {
    const { user } = await renderPage(settings(), me(true));

    const days = screen.getByRole('spinbutton', { name: 'Trust period (days)' });
    await user.clear(days);
    await user.type(days, '60');
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', {
      name: 'Let trusted devices skip the code for longer?',
    });
    expect(dialog).toHaveTextContent('Confirm your password and a code to continue.');
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('says how many passkeys turning them off deletes', async () => {
    passkeysImpact(1);
    const { user } = await renderPage(settings(), me(true));

    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', { name: 'Turn passkeys off?' });
    expect(
      await within(dialog).findByText(
        'This deletes 1 passkey your users registered. This cannot be undone.'
      )
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Turn off' })).toBeInTheDocument();
  });

  it('falls back to "all passkeys" when the count cannot be read', async () => {
    server.use(
      http.get(
        '/admin/security-settings/passkeys-impact',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const { user } = await renderPage(settings(), me(true));

    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', { name: 'Turn passkeys off?' });
    expect(
      within(dialog).getByText(
        'This deletes all passkeys your users registered. This cannot be undone.'
      )
    ).toBeInTheDocument();
  });

  it('lets an SSO-only caller turn passkeys off with a confirmation and no credentials', async () => {
    const bodies = captureSave();
    passkeysImpact(2);
    const { user } = await renderPage(settings(), me(false, false));

    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('dialog', { name: 'Turn passkeys off?' });
    expect(within(dialog).queryByLabelText('Current password*')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Turn off' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ passkeys: { enabled: false } });
  });

  /**
   * Raising enforcement can put every password user on a lockout clock, so it shows how many
   * people and how long they have first. No credentials: that gate is for the opposite direction.
   */
  it('confirms a raise with its blast radius, then saves', async () => {
    const bodies = captureSave();
    mfaImpact(12, 5);
    const { user } = await renderPage(settings(), me(true));

    await chooseMode(user, 'Required for everyone');
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Require two-factor authentication?',
    });
    // Counts the users who still have to set it up, then the ones who already have it.
    expect(dialog).toHaveTextContent(
      '7 users will be asked to set up two-factor authentication. 5 more already use it.'
    );
    expect(dialog).toHaveTextContent('Each has 7 days from their next login');
    expect(bodies).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Require' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ mfa: { mode: 'required', graceDays: 7, requiredRoles: ['1'] } });
  });

  /** "3 users will be asked to set up... and 3 of them already have it" read as a contradiction. */
  it('says nobody will be asked when everyone the raise adds already has two-factor', async () => {
    mfaImpact(3, 3);
    const { user } = await renderPage(settings(), me(true));

    await chooseMode(user, 'Required for everyone');
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Require two-factor authentication?',
    });
    expect(dialog).toHaveTextContent(
      'All 3 users this adds already use two-factor authentication. Nobody will be asked to set it up.'
    );
    expect(dialog).not.toHaveTextContent(/will be asked to set up two-factor/);
  });

  it('asks for credentials after the raise when the same save also widens trust', async () => {
    const bodies = captureSave();
    mfaImpact(3, 0);
    const { user } = await renderPage(settings(), me(true));

    await chooseMode(user, 'Required for everyone');
    const days = screen.getByRole('spinbutton', { name: 'Trust period (days)' });
    await user.clear(days);
    await user.type(days, '60');
    fireEvent.click(saveButton());

    fireEvent.click(
      within(
        await screen.findByRole('alertdialog', { name: 'Require two-factor authentication?' })
      ).getByRole('button', { name: 'Require' })
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Let trusted devices skip the code for longer?',
    });
    expect(bodies).toHaveLength(0);
    await user.type(within(dialog).getByLabelText('Current password*'), 'Testing123!');
    await user.type(within(dialog).getByLabelText('Authentication code*'), '123456');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      mfa: { mode: 'required' },
      trustedDevices: { enabled: true, days: 60 },
      password: 'Testing123!',
    });
  });

  it('saves nothing when the raise is cancelled, and keeps the draft', async () => {
    const bodies = captureSave();
    mfaImpact(3, 0);
    const { user } = await renderPage(settings(), me(true));

    await chooseMode(user, 'Required for everyone');
    fireEvent.click(saveButton());
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Require two-factor authentication?',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(bodies).toHaveLength(0);
    expect(screen.getByRole('combobox', { name: 'Requirement' })).toHaveTextContent(
      'Required for everyone'
    );
  });

  it('says to set up two-factor authentication first, and disables Save, for an unenrolled caller', async () => {
    const { user } = await renderPage(settings(), me(false));

    await chooseMode(user, 'Required for everyone');

    expect(
      screen.getByText(/Set up two-factor authentication on your own account before requiring it/)
    ).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('does not apply the set-up-first guard to a caller with no local password', async () => {
    const { user } = await renderPage(settings(), me(false, false));

    await chooseMode(user, 'Required for everyone');

    expect(screen.queryByText(/before requiring it for others/)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('hides the role picker outside "Required for selected roles" and the grace period under "Not required"', async () => {
    const { user } = await renderPage(settings(), me(true));

    expect(screen.getByRole('combobox', { name: 'Require for these roles' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toBeInTheDocument();

    await chooseMode(user, 'Required for everyone');
    expect(
      screen.queryByRole('combobox', { name: 'Require for these roles' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toBeInTheDocument();

    await chooseMode(user, 'Not required');
    expect(
      screen.queryByRole('spinbutton', { name: 'Grace period (days)' })
    ).not.toBeInTheDocument();
  });

  it('refuses "Required for selected roles" with no role selected', async () => {
    const bodies = captureSave();
    const { user } = await renderPage(
      settings({ mfa: { mode: 'off', graceDays: 7, requiredRoles: [] } }),
      me(true)
    );

    await chooseMode(user, 'Required for selected roles');
    fireEvent.click(saveButton());

    expect(await screen.findByText('Select at least one role.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('refuses an out-of-range grace period client-side', async () => {
    const bodies = captureSave();
    const { user } = await renderPage(settings(), me(true));

    const grace = screen.getByRole('spinbutton', { name: 'Grace period (days)' });
    await user.clear(grace);
    await user.type(grace, '31');
    fireEvent.click(saveButton());

    expect(
      await screen.findByText('Enter a whole number of days between 1 and 30.')
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  /** The server stays the authority, and its refusal shows next to the card it concerns. */
  it('shows a server refusal inside the card the save changed', async () => {
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
    mfaImpact(4, 0);
    const { user } = await renderPage(settings(), me(true));

    await chooseMode(user, 'Required for everyone');
    fireEvent.click(saveButton());
    fireEvent.click(
      within(
        await screen.findByRole('alertdialog', { name: 'Require two-factor authentication?' })
      ).getByRole('button', { name: 'Require' })
    );

    const card = screen.getByRole('region', { name: 'Two-factor authentication' });
    expect(
      await within(card).findByText(
        'Set up two-factor authentication on your own account before requiring it for others.'
      )
    ).toBeInTheDocument();
  });

  it('warns before navigating away from unsaved changes', async () => {
    const { user } = await renderPage(settings(), me(true));

    await user.click(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    );
    await user.click(screen.getByRole('link', { name: 'Leave' }));

    expect(
      await screen.findByText('You have unsaved changes, are you sure you want to leave?')
    ).toBeInTheDocument();
  });

  it('lets the user navigate away freely when nothing is unsaved', async () => {
    const { user } = await renderPage(settings(), me(true));

    await user.click(screen.getByRole('link', { name: 'Leave' }));

    expect(
      screen.queryByText('You have unsaved changes, are you sure you want to leave?')
    ).not.toBeInTheDocument();
  });
});
