import * as React from 'react';

import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { createIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { MfaNotices, formatMfaNotice } from '../MfaNotices';

const NOTICES = [
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

/** `/admin/mfa/me` defaults to 404 in the shared test server, matching the flag being off. */
const status = (overrides = {}) =>
  http.get('/admin/mfa/me', () =>
    HttpResponse.json({
      data: {
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 7,
        codesAcknowledged: true,
        required: false,
        graceUntil: null,
        ...overrides,
      },
    })
  );

const LocationDisplay = () => <span data-testid="location">{useLocation().pathname}</span>;

describe('MfaNotices', () => {
  it('links "profile page" to the profile, and the notice goes away there without marking seen', async () => {
    let seenCalls = 0;
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: NOTICES })),
      http.post('/admin/mfa/notices/seen', () => {
        seenCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(
      <>
        <MfaNotices />
        <LocationDisplay />
      </>
    );

    await screen.findByText(/2 security events on your account/i);
    await user.click(screen.getByRole('link', { name: 'profile page' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/me');
    await waitFor(() =>
      expect(screen.queryByText(/2 security events on your account/i)).not.toBeInTheDocument()
    );
    // The profile lists the same events with its own "Mark all as seen".
    expect(seenCalls).toBe(0);
  });

  it('does not show the notice on the profile page, which lists the events itself', async () => {
    let noticesRead = 0;
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => {
        noticesRead += 1;
        return HttpResponse.json({ data: NOTICES });
      })
    );
    render(<MfaNotices />, { initialEntries: ['/me'] });

    await waitFor(() => expect(noticesRead).toBe(1));
    // One more tick for the effect that would raise the notice.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/security events on your account/i)).not.toBeInTheDocument();
  });

  it('shows one inline warning summarising unseen notices and marks them seen on close', async () => {
    let seenBody: unknown;
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: NOTICES })),
      http.post('/admin/mfa/notices/seen', async ({ request }) => {
        seenBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<MfaNotices />);

    expect(await screen.findByText(/2 security events on your account/i)).toBeInTheDocument();
    expect(screen.getByText('Security notice')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(seenBody).toEqual({ ids: [1, 2] }));
  });

  /** The design system's permanent `#live-region-alert` node always carries `role="alert"` even
   * when empty, so assert on text rather than role. */
  it('is silent when the feature is off (404)', async () => {
    server.use(
      http.get('/admin/mfa/notices', () =>
        HttpResponse.json(
          {
            data: null,
            error: { status: 404, name: 'NotFoundError', message: 'Not Found', details: {} },
          },
          { status: 404 }
        )
      )
    );
    render(<MfaNotices />);

    await waitFor(() => expect(screen.queryByText(/security event/i)).not.toBeInTheDocument());
  });

  /** Without the `skip`, `/admin/mfa/notices` is requested on every authenticated load regardless of
   * the flag -- a guaranteed 404 on every default-off instance. The 404 from `/admin/mfa/me` is the
   * only signal this component may read; it must never read the flag directly. */
  it('does not request mfa notices at all when the status query 404s (feature off)', async () => {
    let noticesRequested = false;
    server.use(
      http.get('/admin/mfa/notices', () => {
        noticesRequested = true;
        return HttpResponse.json({ data: [] });
      })
    );
    render(<MfaNotices />);

    // Give the notices request time to fire, if the skip were absent, before asserting it did not.
    await waitFor(() => expect(screen.queryByText(/security event/i)).not.toBeInTheDocument());
    expect(noticesRequested).toBe(false);
  });

  /** Notices must still flow for a user who is not currently enrolled, so the skip may depend only
   * on the status query 404ing, never on `status.enabled`. */
  it('still shows the notice when the status query resolves with enabled: false', async () => {
    server.use(
      status({ enabled: false, enabledAt: null, recoveryCodesRemaining: 0 }),
      http.get('/admin/mfa/notices', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              type: 'reset',
              metadata: {},
              createdAt: '2026-09-01T10:00:00.000Z',
              seenAt: null,
            },
          ],
        })
      )
    );
    render(<MfaNotices />);

    expect(await screen.findByText(/1 security event on your account/i)).toBeInTheDocument();
  });

  it('is silent when there are no unseen notices', async () => {
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: [] }))
    );
    render(<MfaNotices />);

    await waitFor(() => expect(screen.queryByText(/security event/i)).not.toBeInTheDocument());
  });

  /**
   * RTK Query structurally shares results, so a refetch returning the *same* notices keeps the same
   * `data` reference and would not exercise the `announced` ref at all. The mock adds a third event
   * after the dismiss, forcing a genuinely new reference: one notice per app load means even that
   * must not raise a second.
   */
  it('does not raise a second notice for a newly-arrived event once one has already been shown this session', async () => {
    let getCallCount = 0;
    let seenBody: unknown;
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => {
        getCallCount += 1;
        if (getCallCount === 1) {
          return HttpResponse.json({ data: NOTICES });
        }
        return HttpResponse.json({
          data: [
            {
              id: 3,
              type: 'challenge_failed',
              metadata: {},
              createdAt: '2026-09-01T12:00:00.000Z',
              seenAt: null,
            },
          ],
        });
      }),
      http.post('/admin/mfa/notices/seen', async ({ request }) => {
        seenBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<MfaNotices />);

    await screen.findByText(/2 security events on your account/i);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(seenBody).toEqual({ ids: [1, 2] }));

    await waitFor(() =>
      expect(screen.queryByText(/2 security events on your account/i)).not.toBeInTheDocument()
    );

    // Now wait for the invalidation-triggered refetch (returning the new, different notice list)
    // to actually happen before asserting silence -- otherwise a premature check would pass
    // trivially before the refetch (and thus the would-be second effect run) ever occurs.
    await waitFor(() => expect(getCallCount).toBeGreaterThanOrEqual(2));
    expect(screen.queryByText(/security events? on your account/i)).not.toBeInTheDocument();
  });

  it('goes away with its layout (e.g. an in-SPA logout) without marking the notices seen', async () => {
    let seenCalled = false;
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: NOTICES })),
      http.post('/admin/mfa/notices/seen', () => {
        seenCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const Harness = () => {
      const [mounted, setMounted] = React.useState(true);
      return (
        <>
          {mounted ? <MfaNotices /> : null}
          <button onClick={() => setMounted(false)}>logout</button>
        </>
      );
    };
    const { user } = render(<Harness />);

    await screen.findByText(/2 security events on your account/i);

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.queryByText(/2 security events on your account/i)).not.toBeInTheDocument();
    expect(seenCalled).toBe(false);
  });
});

describe('formatMfaNotice (device notices)', () => {
  const intl = createIntl({ locale: 'en', messages: {} });
  const base = { id: 1, createdAt: '2026-09-08T10:00:00.000Z', seenAt: null } as const;
  const format = (notice: Parameters<typeof formatMfaNotice>[0]) =>
    formatMfaNotice(notice, intl.formatMessage, intl.formatDate);

  it('names the administrator only when the revocation carries byUserId', () => {
    expect(
      format({ ...base, type: 'device_trust_revoked', metadata: { count: 2, byUserId: '9' } })
    ).toMatch(/^Trusted devices were revoked by an administrator \(/);
    expect(format({ ...base, type: 'device_trust_revoked', metadata: { count: 1 } })).toMatch(
      /^Trusted devices were revoked \(/
    );
    expect(format({ ...base, type: 'device_trusted', metadata: { days: 30 } })).toMatch(
      /^A device was trusted to skip the two-factor code \(/
    );
  });

  it('names the device only when the revocation carries both deviceName and days', () => {
    expect(
      format({
        ...base,
        type: 'device_trusted',
        metadata: { days: 30, deviceName: 'Chrome on macOS' },
      })
    ).toMatch(/^A device was trusted for 30 days: Chrome on macOS \(/);
    expect(
      format({
        ...base,
        type: 'device_trusted',
        metadata: { days: 1, deviceName: 'Safari on iOS' },
      })
    ).toMatch(/^A device was trusted for 1 day: Safari on iOS \(/);
    expect(format({ ...base, type: 'device_trusted', metadata: { days: 30 } })).toMatch(
      /^A device was trusted to skip the two-factor code \(/
    );
  });
});

describe('formatMfaNotice (passkey notices)', () => {
  const intl = createIntl({ locale: 'en', messages: {} });
  const base = { id: 1, createdAt: '2026-09-09T10:00:00.000Z', seenAt: null } as const;
  const format = (notice: Parameters<typeof formatMfaNotice>[0]) =>
    formatMfaNotice(notice, intl.formatMessage, intl.formatDate);

  it('has copy for both passkey notices the server records a row for', () => {
    expect(
      format({ ...base, type: 'passkey_registered', metadata: { deviceName: 'MacBook Touch ID' } })
    ).toMatch(/^A passkey was added to your account \(/);
    expect(
      format({ ...base, type: 'passkey_removed', metadata: { deviceName: 'MacBook Touch ID' } })
    ).toMatch(/^A passkey was removed from your account \(/);
  });
});
