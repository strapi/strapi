/* eslint-disable check-file/filename-naming-convention */
import { act, renderHook, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useSecuritySettingsSave } from '../useSecuritySettingsSave';

import type { UseSecuritySettingsSaveOptions } from '../useSecuritySettingsSave';

const PATCH = { passkeys: { enabled: false } } as const;

const captureSave = () => {
  const bodies: unknown[] = [];
  server.use(
    http.put('/admin/security-settings', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        data: {
          mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] },
          trustedDevices: { enabled: true, days: 30 },
          passkeys: { enabled: false },
        },
      });
    })
  );
  return bodies;
};

const renderSave = (options: Partial<UseSecuritySettingsSaveOptions> = {}) =>
  renderHook(() =>
    useSecuritySettingsSave({ patch: PATCH, requiresCredentials: false, ...options })
  );

describe('useSecuritySettingsSave', () => {
  it('sends only the card own object and toasts on success', async () => {
    const bodies = captureSave();
    const { result } = renderSave();

    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ passkeys: { enabled: false } });
    expect(result.current.saveError).toBeUndefined();
    expect(result.current.downgradeOpen).toBe(false);
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('opens the downgrade dialog instead of saving when credentials are required', async () => {
    const bodies = captureSave();
    const { result } = renderSave({ requiresCredentials: true });

    await act(async () => {
      await result.current.save();
    });

    expect(bodies).toHaveLength(0);
    expect(result.current.downgradeOpen).toBe(true);
  });

  it('sends the credentials with the object and closes the dialog on success', async () => {
    const bodies = captureSave();
    const { result } = renderSave({ requiresCredentials: true });

    await act(async () => {
      await result.current.save();
    });
    let message: string | undefined = 'unset';
    await act(async () => {
      message = await result.current.confirmDowngrade({ password: 'Testing123!', code: '123456' });
    });

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      passkeys: { enabled: false },
      password: 'Testing123!',
      code: '123456',
    });
    expect(message).toBeUndefined();
    expect(result.current.downgradeOpen).toBe(false);
  });

  it('returns the refusal message and keeps the dialog open', async () => {
    server.use(
      http.put('/admin/security-settings', () =>
        HttpResponse.json(
          { error: { status: 400, name: 'ValidationError', message: 'Nope', details: {} } },
          { status: 400 }
        )
      )
    );
    const { result } = renderSave({ requiresCredentials: true });

    await act(async () => {
      await result.current.save();
    });
    let message: string | undefined;
    await act(async () => {
      message = await result.current.confirmDowngrade({ password: 'Testing123!' });
    });

    expect(message).toBe('Nope');
    expect(result.current.downgradeOpen).toBe(true);
  });

  it('surfaces a refusal on the direct path as saveError', async () => {
    server.use(
      http.put('/admin/security-settings', () =>
        HttpResponse.json(
          { error: { status: 400, name: 'ValidationError', message: 'Nope', details: {} } },
          { status: 400 }
        )
      )
    );
    const { result } = renderSave();

    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => expect(result.current.saveError).toBe('Nope'));
  });

  it('sends nothing when the card own validation fails, and clears a previous error first', async () => {
    const bodies = captureSave();
    const validate = jest.fn(() => false);
    const { result } = renderSave({ validate });

    await act(async () => {
      await result.current.save();
    });

    expect(validate).toHaveBeenCalledTimes(1);
    expect(bodies).toHaveLength(0);
    expect(result.current.saveError).toBeUndefined();
    expect(result.current.downgradeOpen).toBe(false);
  });
});
