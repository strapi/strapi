import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SessionsPage } from '../SessionsPage';

describe('SessionsPage', () => {
  beforeAll(() => {
    window.localStorage.setItem('jwtToken', JSON.stringify('token'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('exposes a way to log out of all devices when sessions exist', async () => {
    const { findByRole } = render(<SessionsPage />);

    await findByRole('heading', { name: 'Active Devices' });

    expect(await findByRole('button', { name: /log out of all devices/i })).toBeInTheDocument();
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
});
