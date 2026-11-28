import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { GLOBAL_BANNERS_HEIGHT_VAR } from '../../constants/theme';
import { MfaBanners } from '../MfaBanners';

/**
 * The security notice must never cover the "Two-factor authentication required" banner: both are
 * in one flow container, banner first, notice under it, and the container publishes its height for
 * whatever is positioned against the viewport top.
 */
describe('MfaBanners', () => {
  const originalFuture = window.strapi.future;

  beforeEach(() => {
    window.strapi.future = { isEnabled: (name) => name === 'unstableAdminMfa' };
  });

  afterEach(() => {
    window.strapi.future = originalFuture;
  });

  it('renders nothing and requests nothing in a build without the feature', async () => {
    window.strapi.future = { isEnabled: () => false };
    const requested: string[] = [];
    const record = ({ request }: { request: Request }) => {
      requested.push(new URL(request.url).pathname);
    };
    server.events.on('request:start', record);

    try {
      render(
        <div data-testid="column">
          <MfaBanners />
        </div>
      );
      // Let any query the banners might have started reach the network layer.
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(screen.getByTestId('column')).toBeEmptyDOMElement();
      expect(requested.filter((path) => path.startsWith('/admin/mfa'))).toEqual([]);
    } finally {
      server.events.removeListener('request:start', record);
    }
  });

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

    const stack = screen.getByTestId('mfa-banners');
    const banner = Array.from(stack.children).find((child) => child.contains(bannerTitle));
    const notice = Array.from(stack.children).find((child) => child.contains(noticeText));

    // Siblings in the same flow container, the more serious banner first: stacked, never overlapping.
    expect(banner).toBeDefined();
    expect(notice).toBeDefined();
    expect(banner).not.toBe(notice);
    expect(banner!.nextElementSibling).toBe(notice);
    // Not portalled into the toaster.
    expect(noticeText.closest('[data-sonner-toaster]')).toBeNull();
  });

  it('publishes the stack height for the toasts and removes it on unmount', async () => {
    server.use(
      http.get('/admin/mfa/me', () =>
        HttpResponse.json({
          data: {
            enabled: false,
            enabledAt: null,
            recoveryCodesRemaining: 0,
            codesAcknowledged: false,
            required: false,
            graceUntil: null,
          },
        })
      ),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: [] }))
    );
    const root = document.documentElement;

    const { unmount } = render(<MfaBanners />);

    // jsdom lays nothing out, so an empty stack measures 0: what matters is that the variable is
    // there for readers while mounted, and gone afterwards so they fall back to `0px`.
    await waitFor(() => expect(root.style.getPropertyValue(GLOBAL_BANNERS_HEIGHT_VAR)).toBe('0px'));
    unmount();
    expect(root.style.getPropertyValue(GLOBAL_BANNERS_HEIGHT_VAR)).toBe('');
  });
});
