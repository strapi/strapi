import { render, server, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { MfaBanners } from '../MfaBanners';

/**
 * Pins item 31 of the round-2 review: the security notice must never cover the "Two-factor
 * authentication required" banner. It once did, as a toast floating at the top of the page, and the
 * fix regressed once. Both are now inline in one container, banner first, notice under it.
 */
describe('MfaBanners', () => {
  it('renders the security notice inline, directly after the grace banner and outside any toast region', async () => {
    server.use(
      http.get('/admin/mfa/me', () =>
        HttpResponse.json({
          data: {
            enabled: false,
            enabledAt: null,
            recoveryCodesRemaining: 0,
            codesAcknowledged: false,
            required: true,
            graceUntil: '2026-09-11T14:30:00.000Z',
          },
        })
      ),
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

    render(
      <div data-testid="column">
        <MfaBanners />
      </div>
    );

    const bannerTitle = await screen.findByText('Two-factor authentication required');
    const noticeText = await screen.findByText(/1 security event on your account/i);

    const column = screen.getByTestId('column');
    const banner = Array.from(column.children).find((child) => child.contains(bannerTitle));
    const notice = Array.from(column.children).find((child) => child.contains(noticeText));

    // Siblings in the same flow container, banner first: stacked, never overlapping.
    expect(banner).toBeDefined();
    expect(notice).toBeDefined();
    expect(banner).not.toBe(notice);
    expect(banner!.nextElementSibling).toBe(notice);
    // Not portalled into the toaster.
    expect(noticeText.closest('[data-sonner-toaster]')).toBeNull();
  });
});
