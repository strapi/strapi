import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SessionsPage } from '../SessionsPage';

const mockLogout = jest.fn(() => Promise.resolve());
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../features/Auth', () => ({
  ...jest.requireActual('../../features/Auth'),
  useAuth: (_: string, selector: (state: { logout: typeof mockLogout }) => unknown) =>
    selector({ logout: mockLogout }),
}));

describe('SessionsPage', () => {
  beforeAll(() => {
    window.localStorage.setItem('jwtToken', JSON.stringify('token'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it('renders the active sessions returned by the API', async () => {
    const { findByRole, getByText } = render(<SessionsPage />);

    await findByRole('heading', { name: 'Active Devices' });

    // Both sessions are listed with their IP addresses.
    expect(getByText('127.0.0.1')).toBeInTheDocument();
    expect(getByText('10.0.0.2')).toBeInTheDocument();

    // The current session shows its human-readable device name; the other one (no
    // deviceName) falls back to the truncated device id.
    expect(getByText('Chrome on macOS')).toBeInTheDocument();
    expect(getByText('device-b')).toBeInTheDocument();

    // The current session is flagged.
    expect(getByText('This device')).toBeInTheDocument();
  });

  it('exposes a way to log out of other devices when multiple sessions exist', async () => {
    const { findByRole } = render(<SessionsPage />);

    await findByRole('heading', { name: 'Active Devices' });

    expect(await findByRole('button', { name: /log out of other devices/i })).toBeInTheDocument();
    expect(await findByRole('button', { name: /log out of all devices/i })).toBeInTheDocument();
  });

  it('keeps the current session when logging out of other devices', async () => {
    let keepCurrent: string | null = null;
    server.use(
      http.delete('/admin/users/me/sessions', ({ request }) => {
        keepCurrent = new URL(request.url).searchParams.get('keepCurrent');
        return HttpResponse.json({ data: {} });
      })
    );

    const { findByRole, getByRole, user } = render(<SessionsPage />);

    await findByRole('heading', { name: 'Active Devices' });

    await user.click(await findByRole('button', { name: /log out of other devices/i }));

    const confirm = await findByRole('button', { name: /confirm/i });
    await user.click(confirm);

    await waitFor(() => expect(keepCurrent).toBe('true'));
    expect(getByRole('heading', { name: 'Active Devices' })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('calls the revoke endpoint when ending a non-current session', async () => {
    let revokedId: string | undefined;
    server.use(
      http.delete('/admin/users/me/sessions/:sessionId', ({ params }) => {
        revokedId = params.sessionId as string;
        return HttpResponse.json({ data: {} });
      })
    );

    const { findByRole, getAllByRole, user } = render(<SessionsPage />);

    await findByRole('heading', { name: 'Active Devices' });

    // The second row corresponds to the non-current "device-bbbbbbbb" session.
    const endButtons = getAllByRole('button', { name: 'End session' });
    await user.click(endButtons[1]);

    const confirm = await findByRole('button', { name: /confirm/i });
    await user.click(confirm);

    await waitFor(() => expect(revokedId).toBe('session-other'));
  });

  it('logs out of all devices and redirects to login', async () => {
    let keepCurrent: string | null = 'unset';
    server.use(
      http.delete('/admin/users/me/sessions', ({ request }) => {
        keepCurrent = new URL(request.url).searchParams.get('keepCurrent');
        return HttpResponse.json({ data: {} });
      })
    );

    const { findByRole, user } = render(<SessionsPage />);

    await findByRole('heading', { name: 'Active Devices' });
    await user.click(await findByRole('button', { name: /log out of all devices/i }));
    await user.click(await findByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(keepCurrent).toBeNull());
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
  });
});
