import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { TwoFactorSection } from '../TwoFactorSection';

const status = (overrides = {}) =>
  http.get('/admin/mfa/me', () =>
    HttpResponse.json({
      data: {
        enabled: false,
        enabledAt: null,
        recoveryCodesRemaining: 0,
        codesAcknowledged: false,
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
});
