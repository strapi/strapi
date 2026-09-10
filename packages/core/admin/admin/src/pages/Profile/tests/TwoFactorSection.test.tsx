import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { createIntl } from 'react-intl';

import { formatMfaNotice } from '../../../features/MfaNotices';
import { TwoFactorSection } from '../TwoFactorSection';

import type { MfaEventNotice } from '../../../../../shared/contracts/mfa';

/**
 * A standalone `IntlShape` (no `messages`, so every id falls back to its `defaultMessage`,
 * matching the real app's `LanguageProvider messages={{}}` in `@tests/utils`) lets us build the
 * exact string `formatMfaNotice` produces, so the assertions below don't hardcode copy that
 * already lives in `MfaNotices.tsx`.
 */
const intl = createIntl({ locale: 'en', messages: {} });
const expectFormattedNotice = (notice: MfaEventNotice) =>
  formatMfaNotice(notice, intl.formatMessage, intl.formatDate);

const status = (overrides = {}) =>
  http.get('/admin/mfa/me', () =>
    HttpResponse.json({
      data: {
        enabled: false,
        enabledAt: null,
        recoveryCodesRemaining: 0,
        codesAcknowledged: false,
        required: false,
        graceUntil: null,
        trustedDevicesEnabled: false,
        passkeysEnabled: false,
        ...overrides,
      },
    })
  );

/**
 * The shared test render wraps every component in the full admin app chrome
 * (`NotificationsProvider`'s "alt+T" section, and the design system's permanent
 * `#live-region-log` / `#live-region-status` / `#live-region-alert` elements). Those are
 * siblings of whatever we render, not descendants of it, and the `#live-region-status` node
 * always carries `role="status"` even when empty -- so a bare `getByRole('status')` is
 * ambiguous the moment our own status-variant `Alert` mounts, and `container` is never empty
 * even when this component itself renders `null`. Wrapping the component under test in our own
 * marker element sidesteps both: the marker only ever contains what `TwoFactorSection` itself
 * renders.
 */
const renderSection = () => {
  const { getByTestId, ...utils } = render(
    <div data-testid="mfa-section-root">
      <TwoFactorSection />
    </div>
  );

  return { root: getByTestId('mfa-section-root'), ...utils };
};

describe('TwoFactorSection', () => {
  it('renders nothing while the feature is off (404)', async () => {
    server.use(http.get('/admin/mfa/me', () => new HttpResponse(null, { status: 404 })));
    const { root } = renderSection();

    await waitFor(() => expect(root).toBeEmptyDOMElement());
  });

  it('shows the disabled state when not enrolled', async () => {
    server.use(status());
    renderSection();

    expect(
      await screen.findByRole('heading', { name: 'Two-factor authentication' })
    ).toBeInTheDocument();
    expect(screen.getByText('Not enabled')).toBeInTheDocument();
    expect(screen.queryByText(/recovery codes/i)).not.toBeInTheDocument();
  });

  it('shows enabled-since and the recovery code count when enrolled', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 7,
        codesAcknowledged: true,
      })
    );
    renderSection();

    expect(await screen.findByText(/^Enabled/)).toBeInTheDocument();
    expect(screen.getByText('7 recovery codes left')).toBeInTheDocument();
    expect(screen.queryByText('Recovery codes not saved')).not.toBeInTheDocument();
    expect(screen.queryByText('Running low on recovery codes')).not.toBeInTheDocument();
  });

  /** Minor (a): the count strings are ICU plural, not bare `{count}` -- "1 recovery code left". */
  it('shows the singular recovery code count when exactly 1 remains', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 1,
        codesAcknowledged: true,
      })
    );
    renderSection();

    expect(await screen.findByText('1 recovery code left')).toBeInTheDocument();
  });

  it('warns when the recovery codes were never acknowledged', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: false,
      })
    );
    renderSection();

    expect(await screen.findByText('Recovery codes not saved')).toBeInTheDocument();
    expect(screen.getByText(/have not confirmed/i)).toBeInTheDocument();
  });

  it('warns when 3 or fewer recovery codes remain', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 3,
        codesAcknowledged: true,
      })
    );
    renderSection();

    expect(await screen.findByText('Running low on recovery codes')).toBeInTheDocument();
    expect(screen.getByText(/only 3 recovery codes left/i)).toBeInTheDocument();
  });

  it('uses the singular low-codes warning when exactly 1 recovery code remains', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 1,
        codesAcknowledged: true,
      })
    );
    renderSection();

    expect(await screen.findByText('Running low on recovery codes')).toBeInTheDocument();
    expect(screen.getByText(/only 1 recovery code left/i)).toBeInTheDocument();
  });

  it('offers to enable two-factor authentication when not enrolled', async () => {
    server.use(status());
    const { user } = renderSection();

    const enableButton = await screen.findByRole('button', {
      name: 'Enable two-factor authentication',
    });

    await user.click(enableButton);

    expect(
      await screen.findByRole('dialog', { name: 'Enable two-factor authentication' })
    ).toBeInTheDocument();
  });

  it('offers to regenerate recovery codes and to disable two-factor authentication when enrolled', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 7,
        codesAcknowledged: true,
      })
    );
    const { user } = renderSection();

    const regenerateButton = await screen.findByRole('button', {
      name: 'Generate new recovery codes',
    });
    const disableButton = screen.getByRole('button', {
      name: 'Disable two-factor authentication',
    });

    await user.click(regenerateButton);
    expect(
      await screen.findByRole('dialog', { name: 'Generate new recovery codes' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(disableButton);
    expect(
      await screen.findByRole('dialog', { name: 'Disable two-factor authentication' })
    ).toBeInTheDocument();
  });

  it('lists unseen security events when enrolled and marks them all as seen', async () => {
    const notices: MfaEventNotice[] = [
      {
        id: 1,
        type: 'challenge_failed',
        metadata: {},
        createdAt: '2026-09-01T10:00:00.000Z',
        seenAt: null,
      },
      {
        id: 2,
        type: 'recovery_code_used',
        metadata: {},
        createdAt: '2026-09-01T11:00:00.000Z',
        seenAt: null,
      },
    ];
    let seenBody: unknown;
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 7,
        codesAcknowledged: true,
      }),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: notices })),
      http.post('/admin/mfa/notices/seen', async ({ request }) => {
        seenBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = renderSection();

    expect(
      await screen.findByRole('heading', { name: 'Recent security events' })
    ).toBeInTheDocument();
    expect(screen.getByText(expectFormattedNotice(notices[0]))).toBeInTheDocument();
    expect(screen.getByText(expectFormattedNotice(notices[1]))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark all as seen' }));
    await waitFor(() => expect(seenBody).toEqual({}));
  });

  /**
   * F1: `disabled` and `reset` events are recorded exactly when the user stops being enrolled, so
   * gating the list on `status.enabled` hid it in precisely the case it exists for -- after a
   * self-disable or a CLI-driven reset, the section showed only "Not enabled" with no way to see
   * why, and "Mark all as seen" was unreachable.
   */
  it('lists security events even when not currently enrolled (e.g. after a reset)', async () => {
    const notice: MfaEventNotice = {
      id: 1,
      type: 'reset',
      metadata: {},
      createdAt: '2026-09-01T10:00:00.000Z',
      seenAt: null,
    };
    let seenBody: unknown;
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: [notice] })),
      http.post('/admin/mfa/notices/seen', async ({ request }) => {
        seenBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = renderSection();

    await screen.findByText('Not enabled');
    expect(
      await screen.findByRole('heading', { name: 'Recent security events' })
    ).toBeInTheDocument();
    expect(screen.getByText(expectFormattedNotice(notice))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark all as seen' }));
    await waitFor(() => expect(seenBody).toEqual({}));
  });

  it('offers Replace authenticator to an enrolled user who is not required, alongside Disable', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: true,
        required: false,
      })
    );
    renderSection();

    expect(
      await screen.findByRole('button', { name: 'Replace authenticator' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Disable two-factor authentication' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate new recovery codes' })).toBeInTheDocument();
  });

  it('hides Disable and says why while the account is required', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: true,
        required: true,
      })
    );
    renderSection();

    expect(
      await screen.findByRole('button', { name: 'Replace authenticator' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Disable two-factor authentication' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Two-factor authentication is required for your account and cannot be turned off.'
      )
    ).toBeInTheDocument();
  });

  it('states the requirement and the deadline for a required user who has not enrolled', async () => {
    server.use(status({ required: true, graceUntil: '2026-09-11T14:30:00.000Z' }));
    renderSection();

    expect(
      await screen.findByText(/Required for your account\. Set it up before .*2026/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enable two-factor authentication' })
    ).toBeInTheDocument();
  });

  it('states the requirement without a deadline when no grace period is stamped yet', async () => {
    server.use(status({ required: true, graceUntil: null }));
    renderSection();

    expect(await screen.findByText('Required for your account.')).toBeInTheDocument();
  });

  it('opens the enrol dialog in replace mode from the Replace authenticator button', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: true,
      })
    );
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Replace authenticator' }));

    expect(screen.getByRole('dialog', { name: 'Replace authenticator' })).toBeInTheDocument();
    expect(screen.getByLabelText('Authentication code*')).toBeInTheDocument();
  });

  it('lists trusted devices when enrolled and the organisation offers trust', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: true,
        trustedDevicesEnabled: true,
      }),
      http.get('/admin/mfa/trusted-devices', () => HttpResponse.json({ data: [] }))
    );
    renderSection();

    expect(await screen.findByRole('heading', { name: 'Trusted devices' })).toBeInTheDocument();
  });

  it('hides the trusted devices block when the organisation does not offer trust', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: true,
        trustedDevicesEnabled: false,
      })
    );
    renderSection();

    expect(await screen.findByText(/^Enabled/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Trusted devices' })).not.toBeInTheDocument();
  });

  it('lists passkeys when enrolled and the organisation allows them', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: true,
        passkeysEnabled: true,
      }),
      http.get('/admin/mfa/passkeys', () => HttpResponse.json({ data: [] }))
    );
    renderSection();

    expect(await screen.findByRole('heading', { name: 'Passkeys' })).toBeInTheDocument();
  });

  it('hides the passkeys block for an UNENROLLED account even when the organisation allows them', async () => {
    // The other half of the gate. TOTP is the mandatory base factor this cycle: a passkey is a
    // second factor, never a replacement for one, so an account with no authenticator must not be
    // offered a way to add a passkey. Without this case, dropping `status.enabled` from the gate
    // passes every other test in this file -- the same blind spot cycle 3 left on
    // `trustedDevicesEnabled`.
    server.use(
      status({
        enabled: false,
        enabledAt: null,
        recoveryCodesRemaining: 0,
        codesAcknowledged: false,
        passkeysEnabled: true,
      }),
      http.get('/admin/mfa/passkeys', () => HttpResponse.json({ data: [] }))
    );
    renderSection();

    expect(await screen.findByText('Not enabled')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Passkeys' })).not.toBeInTheDocument();
  });

  it('hides the passkeys block when the organisation does not allow them', async () => {
    server.use(
      status({
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 10,
        codesAcknowledged: true,
        passkeysEnabled: false,
      })
    );
    renderSection();

    expect(await screen.findByText(/^Enabled/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Passkeys' })).not.toBeInTheDocument();
  });
});
