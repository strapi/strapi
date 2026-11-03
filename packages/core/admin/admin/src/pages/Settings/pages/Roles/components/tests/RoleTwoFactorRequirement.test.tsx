import { within } from '@testing-library/react';
import { initialState } from '@tests/store';
import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { RoleTwoFactorRequirement } from '../RoleTwoFactorRequirement';

import type { MfaEnforcementSettings } from '../../../../../../../../shared/contracts/security-settings';

/** The shared fixtures grant `admin::security-settings.*`, but their redux permission map has no
 * `settings.security` entry; this wires it in, as the Security page tests do. */
const withSecurityPermissions = () => {
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
  return { storeConfig: { preloadedState } };
};

const handlers = (mfa: MfaEnforcementSettings, { enrolled = true } = {}) => {
  const puts: Array<Record<string, unknown>> = [];
  server.use(
    http.get('/admin/security-settings', () =>
      HttpResponse.json({
        data: {
          mfa,
          trustedDevices: { enabled: false, days: 30 },
          passkeys: { enabled: false },
        },
      })
    ),
    http.get('/admin/mfa/me', () =>
      HttpResponse.json({
        data: {
          enabled: enrolled,
          enabledAt: enrolled ? '2026-09-01T10:14:00.000Z' : null,
          recoveryCodesRemaining: enrolled ? 10 : 0,
          codesAcknowledged: enrolled,
          required: false,
          graceUntil: null,
          trustedDevicesEnabled: false,
          hasLocalPassword: true,
        },
      })
    ),
    http.get('/admin/security-settings/mfa-impact', () =>
      HttpResponse.json({ data: { affected: 4, enrolled: 1 } })
    ),
    http.put('/admin/security-settings', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      puts.push(body);
      return HttpResponse.json({
        data: {
          mfa: body.mfa,
          trustedDevices: { enabled: false, days: 30 },
          passkeys: { enabled: false },
        },
      });
    })
  );
  return puts;
};

const renderToggle = (onRoleSubmit = jest.fn()) =>
  render(
    // The role page's own form surrounds the card; its Save must never fire from the card.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onRoleSubmit();
      }}
    >
      <RoleTwoFactorRequirement roleId={3} />
    </form>,
    { providerOptions: withSecurityPermissions() }
  );

const toggle = () => screen.findByRole('checkbox', { name: 'Require two-factor authentication' });

describe('RoleTwoFactorRequirement', () => {
  it('is not shown to a caller who cannot manage the security settings', async () => {
    const puts = handlers({ mode: 'optional', graceDays: 7, requiredRoles: [] });
    render(<RoleTwoFactorRequirement roleId={3} />);

    // Give the permission check and any request a chance to run.
    await waitFor(() =>
      expect(
        screen.queryByRole('checkbox', { name: 'Require two-factor authentication' })
      ).not.toBeInTheDocument()
    );
    expect(puts).toHaveLength(0);
  });

  it('is not shown while the feature is off', async () => {
    server.use(http.get('/admin/security-settings', () => new HttpResponse(null, { status: 404 })));
    renderToggle();

    await waitFor(() =>
      expect(screen.queryByText('Two-factor authentication')).not.toBeInTheDocument()
    );
  });

  it('requires it for the role after showing who it affects', async () => {
    const puts = handlers({ mode: 'optional', graceDays: 7, requiredRoles: ['1'] });
    const onRoleSubmit = jest.fn();
    const { user } = renderToggle(onRoleSubmit);

    const input = await toggle();
    expect(input).not.toBeChecked();
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.click(input);

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Require two-factor authentication?',
    });
    expect(dialog).toHaveTextContent(/4 users will be asked to set up two-factor authentication/);
    expect(puts).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Require' }));

    await waitFor(() =>
      expect(puts).toEqual([{ mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1', '3'] } }])
    );
    expect(await screen.findByText('Two-factor requirement saved.')).toBeInTheDocument();
    expect(onRoleSubmit).not.toHaveBeenCalled();
  });

  it('asks for the password and a code before dropping the requirement', async () => {
    const puts = handlers({ mode: 'optional', graceDays: 7, requiredRoles: ['1', '3'] });
    const onRoleSubmit = jest.fn();
    const { user } = renderToggle(onRoleSubmit);

    const input = await toggle();
    expect(input).toBeChecked();
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.click(input);

    const dialog = await screen.findByRole('dialog', { name: 'Lower two-factor requirements?' });
    await user.type(within(dialog).getByLabelText('Current password*'), 'Testing123!');
    await user.type(within(dialog).getByLabelText('Authentication code*'), '123456');
    // A real Enter submits the dialog's own form, and React bubbles that submit through the portal.
    fireEvent.submit(within(dialog).getByLabelText('Authentication code*'));

    await waitFor(() =>
      expect(puts).toEqual([
        {
          mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1'] },
          password: 'Testing123!',
          code: '123456',
        },
      ])
    );
    expect(await screen.findByText('Two-factor requirement saved.')).toBeInTheDocument();
    // Enter in the credential dialog must not also save the role form it sits in.
    expect(onRoleSubmit).not.toHaveBeenCalled();
  });

  it('asks for the password alone when the caller is not enrolled', async () => {
    handlers({ mode: 'optional', graceDays: 7, requiredRoles: ['3'] }, { enrolled: false });
    renderToggle();

    const input = await toggle();
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.click(input);

    const dialog = await screen.findByRole('dialog', { name: 'Lower two-factor requirements?' });
    expect(within(dialog).getByLabelText('Current password*')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Authentication code*')).not.toBeInTheDocument();
  });

  it('shows the effective state, disabled, while everyone is required', async () => {
    handlers({ mode: 'required', graceDays: 7, requiredRoles: [] });
    renderToggle();

    const input = await toggle();
    expect(input).toBeChecked();
    expect(input).toBeDisabled();
    expect(screen.getByText('Required for everyone in Settings > Security.')).toBeInTheDocument();
  });

  it('is disabled while nothing is required, and says where to change that', async () => {
    handlers({ mode: 'off', graceDays: 7, requiredRoles: [] });
    renderToggle();

    const input = await toggle();
    expect(input).not.toBeChecked();
    expect(input).toBeDisabled();
    expect(
      screen.getByText(
        'Choose "Required for selected roles" in Settings > Security to set this per role.'
      )
    ).toBeInTheDocument();
  });
});
