import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { OAuthConsentPage } from '../OAuthConsentPage';

const mockToggleNotification = jest.fn();

jest.mock('../../features/Auth', () => ({
  ...jest.requireActual('../../features/Auth'),
  useAuth: (_: string, selector: (state: { user: unknown }) => unknown) =>
    selector({
      user: { firstname: 'Kai', lastname: 'Doe', email: 'kai@example.com' },
    }),
}));

jest.mock('../../features/Notifications', () => ({
  ...jest.requireActual('../../features/Notifications'),
  useNotification: () => ({
    toggleNotification: mockToggleNotification,
  }),
}));

const authorizationRequest = {
  data: {
    client: { name: 'Claude' },
    redirectUri: 'https://example.com/cb',
    redirectHost: 'example.com',
  },
};

describe('OAuthConsentPage', () => {
  const originalLocation = window.location;
  let assignSpy: jest.Mock;

  beforeAll(() => {
    assignSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server.use(
      http.get('/admin/mcp/oauth/authorization-request', () =>
        HttpResponse.json(authorizationRequest)
      )
    );
  });

  it('shows the invalid state without fetching when the ticket is missing', async () => {
    let fetched = false;
    server.use(
      http.get('/admin/mcp/oauth/authorization-request', () => {
        fetched = true;
        return HttpResponse.json(authorizationRequest);
      })
    );

    const { findByRole } = render(<OAuthConsentPage />, {
      initialEntries: ['/mcp/oauth/consent'],
    });

    await findByRole('heading', { name: 'Invalid authorization request' });
    expect(fetched).toBe(false);
  });

  it('shows the invalid state when the ticket is rejected by the API', async () => {
    server.use(
      http.get('/admin/mcp/oauth/authorization-request', () =>
        HttpResponse.json(
          { error: { message: 'invalid', name: 'ApplicationError' } },
          { status: 400 }
        )
      )
    );

    const { findByRole } = render(<OAuthConsentPage />, {
      initialEntries: ['/mcp/oauth/consent?ticket=expired'],
    });

    await findByRole('heading', { name: 'Invalid authorization request' });
  });

  it('renders the consent card with a fixed title, the self-reported client name, user, and redirect host', async () => {
    const { findByRole, getByText, queryByText } = render(<OAuthConsentPage />, {
      initialEntries: ['/mcp/oauth/consent?ticket=abc'],
    });

    // The title never contains the client-chosen name: it is self-reported, so it must not
    // read as a verified heading.
    await findByRole('heading', { name: 'Authorize MCP access to Strapi?' });

    expect(getByText(/A client calling itself “Claude”/)).toBeInTheDocument();
    expect(getByText(/as Kai Doe/)).toBeInTheDocument();
    expect(getByText(/sent back to example.com/)).toBeInTheDocument();
    expect(queryByText(/not a secure https address/)).not.toBeInTheDocument();
    expect(await findByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(await findByRole('button', { name: 'Deny' })).toBeInTheDocument();
  });

  it('shows the full redirect URI and a warning for a non-https redirect', async () => {
    server.use(
      http.get('/admin/mcp/oauth/authorization-request', () =>
        HttpResponse.json({
          data: {
            client: { name: 'Claude' },
            // A custom scheme still parses a host, so showing the host alone would read
            // as "claude.ai"; the full URI must be displayed instead.
            redirectUri: 'evilapp://claude.ai/callback',
            redirectHost: 'claude.ai',
          },
        })
      )
    );

    const { findByRole, getByText } = render(<OAuthConsentPage />, {
      initialEntries: ['/mcp/oauth/consent?ticket=abc'],
    });

    await findByRole('heading', { name: 'Authorize MCP access to Strapi?' });

    expect(getByText(/sent back to evilapp:\/\/claude.ai\/callback/)).toBeInTheDocument();
    expect(getByText(/not a secure https address/)).toBeInTheDocument();
  });

  it('submits the approval and navigates to the returned redirect target', async () => {
    let submitted: unknown;
    server.use(
      http.post('/admin/mcp/oauth/consent', async ({ request }) => {
        submitted = await request.json();
        return HttpResponse.json({
          data: { redirectTo: 'https://example.com/cb?code=xyz' },
        });
      })
    );

    const { findByRole, user } = render(<OAuthConsentPage />, {
      initialEntries: ['/mcp/oauth/consent?ticket=abc'],
    });

    await user.click(await findByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('https://example.com/cb?code=xyz'));
    expect(submitted).toEqual({ ticket: 'abc', decision: 'approve' });
  });

  it('submits the denial', async () => {
    let submitted: unknown;
    server.use(
      http.post('/admin/mcp/oauth/consent', async ({ request }) => {
        submitted = await request.json();
        return HttpResponse.json({
          data: { redirectTo: 'https://example.com/cb?error=access_denied' },
        });
      })
    );

    const { findByRole, user } = render(<OAuthConsentPage />, {
      initialEntries: ['/mcp/oauth/consent?ticket=abc'],
    });

    await user.click(await findByRole('button', { name: 'Deny' }));

    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith('https://example.com/cb?error=access_denied')
    );
    expect(submitted).toEqual({ ticket: 'abc', decision: 'deny' });
  });

  it('notifies on a failed consent submission and stays on the page', async () => {
    server.use(
      http.post('/admin/mcp/oauth/consent', () =>
        HttpResponse.json(
          { error: { message: 'invalid', name: 'ApplicationError' } },
          { status: 400 }
        )
      )
    );

    const { findByRole, user } = render(<OAuthConsentPage />, {
      initialEntries: ['/mcp/oauth/consent?ticket=abc'],
    });

    await user.click(await findByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(mockToggleNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'danger' })
      )
    );
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
