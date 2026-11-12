/* eslint-disable check-file/filename-naming-convention */
import { act, renderHook, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useSecuritySettingsSave } from '../useSecuritySettingsSave';

import type { SecuritySettings } from '../../../../../../../../shared/contracts/security-settings';
import type { UseSecuritySettingsSaveOptions } from '../useSecuritySettingsSave';

const STORED: SecuritySettings = {
  mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1', '2'] },
  trustedDevices: { enabled: true, days: 30 },
  passkeys: { enabled: true },
};

const captureSave = () => {
  const bodies: unknown[] = [];
  server.use(
    http.put('/admin/security-settings', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ data: STORED });
    })
  );
  return bodies;
};

const refuse = (message = 'Nope') =>
  server.use(
    http.put('/admin/security-settings', () =>
      HttpResponse.json(
        { error: { status: 400, name: 'ValidationError', message, details: {} } },
        { status: 400 }
      )
    )
  );

const renderSave = (
  next: Partial<SecuritySettings>,
  options: Partial<UseSecuritySettingsSaveOptions> = {}
) =>
  renderHook(() =>
    useSecuritySettingsSave({
      settings: STORED,
      next: { ...STORED, ...next },
      hasLocalPassword: true,
      ...options,
    })
  );

describe('useSecuritySettingsSave', () => {
  it('sends only the objects that changed, in one request, and toasts', async () => {
    const bodies = captureSave();
    const { result } = renderSave({
      trustedDevices: { enabled: true, days: 7 },
      passkeys: { enabled: true },
    });

    expect(result.current.changed).toEqual({ mfa: false, trustedDevices: true, passkeys: false });
    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ trustedDevices: { enabled: true, days: 7 } });
    expect(await screen.findByText('Security settings saved.')).toBeInTheDocument();
  });

  it('does not read a reordered role list as a change', () => {
    const { result } = renderSave({
      mfa: { ...STORED.mfa, requiredRoles: ['2', '1'] },
    });

    expect(result.current.modified).toBe(false);
  });

  it('sends nothing when validation fails', async () => {
    const bodies = captureSave();
    const { result } = renderSave(
      { trustedDevices: { enabled: true, days: 7 } },
      { validate: () => false }
    );

    await act(async () => {
      await result.current.save();
    });

    expect(bodies).toHaveLength(0);
  });

  it('opens one dialog for every downgrade in the save, and reads the passkey count', async () => {
    const bodies = captureSave();
    server.use(
      http.get('/admin/security-settings/passkeys-impact', () =>
        HttpResponse.json({ data: { count: 4 } })
      )
    );
    const { result } = renderSave({
      mfa: { ...STORED.mfa, mode: 'off' },
      trustedDevices: { enabled: true, days: 60 },
      passkeys: { enabled: false },
    });

    await act(async () => {
      await result.current.save();
    });

    expect(bodies).toHaveLength(0);
    expect(result.current.downgrade).toEqual({
      lowersEnforcement: true,
      widensTrust: true,
      disablesPasskeys: true,
      requiresCredentials: true,
    });
    await waitFor(() => expect(result.current.passkeysCount).toBe(4));

    let message: string | undefined = 'unset';
    await act(async () => {
      message = await result.current.confirmDowngrade({ password: 'Testing123!', code: '123456' });
    });

    expect(message).toBeUndefined();
    expect(bodies[0]).toEqual({
      mfa: { ...STORED.mfa, mode: 'off' },
      trustedDevices: { enabled: true, days: 60 },
      passkeys: { enabled: false },
      password: 'Testing123!',
      code: '123456',
    });
    expect(result.current.downgrade).toBeNull();
  });

  it('leaves the passkey count unset when it cannot be read', async () => {
    captureSave();
    server.use(
      http.get(
        '/admin/security-settings/passkeys-impact',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const { result } = renderSave({ passkeys: { enabled: false } });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.downgrade).not.toBeNull();
    expect(result.current.passkeysCount).toBeUndefined();
  });

  it('asks an SSO-only caller for nothing when turning passkeys off is the only downgrade', async () => {
    const { result } = renderSave({ passkeys: { enabled: false } }, { hasLocalPassword: false });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.downgrade?.requiresCredentials).toBe(false);
  });

  it('asks an SSO-only caller for credentials once another downgrade joins it', async () => {
    const { result } = renderSave(
      { passkeys: { enabled: false }, trustedDevices: { enabled: true, days: 60 } },
      { hasLocalPassword: false }
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.downgrade?.requiresCredentials).toBe(true);
  });

  it('shows the blast radius of a raise before anything else, then carries on', async () => {
    const bodies = captureSave();
    server.use(
      http.get('/admin/security-settings/mfa-impact', () =>
        HttpResponse.json({ data: { affected: 3, enrolled: 1 } })
      )
    );
    const { result } = renderSave({
      mfa: { ...STORED.mfa, mode: 'required' },
      trustedDevices: { enabled: true, days: 60 },
    });

    await act(async () => {
      await result.current.save();
    });
    expect(result.current.impact).toEqual({ affected: 3, enrolled: 1 });
    expect(result.current.downgrade).toBeNull();

    await act(async () => {
      await result.current.confirmRaise();
    });
    // the widened trust still needs credentials after the raise is confirmed
    expect(result.current.impact).toBeNull();
    expect(result.current.downgrade?.widensTrust).toBe(true);
    expect(bodies).toHaveLength(0);
  });

  it('files a refusal under the one card that changed', async () => {
    refuse();
    const { result } = renderSave({ trustedDevices: { enabled: true, days: 7 } });

    await act(async () => {
      await result.current.save();
    });

    await waitFor(() =>
      expect(result.current.saveError).toEqual({ section: 'trustedDevices', message: 'Nope' })
    );
  });

  it('files a refusal under the page when the save touched several cards', async () => {
    refuse();
    const { result } = renderSave({
      trustedDevices: { enabled: true, days: 7 },
      mfa: { ...STORED.mfa, graceDays: 3 },
    });

    await act(async () => {
      await result.current.save();
    });

    await waitFor(() =>
      expect(result.current.saveError).toEqual({ section: 'page', message: 'Nope' })
    );
  });

  it('returns the refusal message from the dialog and keeps it open', async () => {
    refuse('Invalid credentials');
    const { result } = renderSave({ passkeys: { enabled: false } });

    await act(async () => {
      await result.current.save();
    });
    let message: string | undefined;
    await act(async () => {
      message = await result.current.confirmDowngrade({ password: 'x' });
    });

    expect(message).toBe('Invalid credentials');
    expect(result.current.downgrade).not.toBeNull();
  });
});
