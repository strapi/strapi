import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { TrustedDevices } from '../TrustedDevices';

import type { TrustedDevice } from '../../../../../shared/contracts/mfa';

const DEVICES: TrustedDevice[] = [
  {
    id: '3',
    deviceName: 'Chrome on macOS',
    createdAt: '2026-09-01T10:14:00.000Z',
    expiresAt: '2026-10-01T10:14:00.000Z',
    lastUsedAt: '2026-09-08T09:00:00.000Z',
    current: true,
  },
  {
    id: '4',
    deviceName: null,
    createdAt: '2026-09-02T08:00:00.000Z',
    expiresAt: '2026-10-02T08:00:00.000Z',
    lastUsedAt: null,
    current: false,
  },
];

const list = (devices: TrustedDevice[]) =>
  http.get('/admin/mfa/trusted-devices', () => HttpResponse.json({ data: devices }));

describe('TrustedDevices', () => {
  it('lists devices with the current badge, dates and last use', async () => {
    server.use(list(DEVICES));
    render(<TrustedDevices />);

    expect(await screen.findByRole('heading', { name: 'Trusted devices' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(screen.getByText('Chrome on macOS')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    expect(screen.getByText('Unknown device')).toBeInTheDocument();
    expect(screen.getByText('Not yet')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent(/2026/);
    expect(screen.getByRole('button', { name: 'Revoke all' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Revoke trust' })).toHaveLength(2);
  });

  it('shows the empty state without a table or a Revoke all button', async () => {
    server.use(list([]));
    render(<TrustedDevices />);

    expect(
      await screen.findByText(/^No trusted devices\. You can trust a browser/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke all' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('revokes one device after confirmation, toasts, and the list refreshes', async () => {
    let devices = DEVICES;
    server.use(
      http.get('/admin/mfa/trusted-devices', () => HttpResponse.json({ data: devices })),
      http.delete('/admin/mfa/trusted-devices/3', () => {
        devices = devices.filter((device) => device.id !== '3');
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getAllByRole('button', { name: 'Revoke trust' })[0]);
    expect(screen.getByRole('alertdialog', { name: 'Revoke this device?' })).toHaveTextContent(
      /This browser will ask for a code/
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Device no longer trusted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Chrome on macOS')).not.toBeInTheDocument());
    expect(screen.getByText('Unknown device')).toBeInTheDocument();
  });

  it('revokes every device after confirmation', async () => {
    let devices = DEVICES;
    server.use(
      http.get('/admin/mfa/trusted-devices', () => HttpResponse.json({ data: devices })),
      http.delete('/admin/mfa/trusted-devices', () => {
        devices = [];
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getByRole('button', { name: 'Revoke all' }));
    expect(
      screen.getByRole('alertdialog', { name: 'Revoke every trusted device?' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('No device is trusted any more')).toBeInTheDocument();
    expect(await screen.findByText(/^No trusted devices\./)).toBeInTheDocument();
  });

  it('the confirmation for a non-current row says the OTHER browser will ask for a code', async () => {
    server.use(list(DEVICES));
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getAllByRole('button', { name: 'Revoke trust' })[1]);
    expect(screen.getByRole('alertdialog', { name: 'Revoke this device?' })).toHaveTextContent(
      'That browser will ask for a code at its next login.'
    );
  });

  it('the revoke-all confirmation says every trusted browser when none of them is the current one', async () => {
    server.use(list(DEVICES.map((device) => ({ ...device, current: false }))));
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getByRole('button', { name: 'Revoke all' }));
    expect(
      screen.getByRole('alertdialog', { name: 'Revoke every trusted device?' })
    ).toHaveTextContent('Every trusted browser will ask for a code at its next login.');
  });

  it('toasts the server message when a revoke is refused', async () => {
    server.use(
      list(DEVICES),
      http.delete('/admin/mfa/trusted-devices/3', () =>
        HttpResponse.json(
          {
            error: {
              status: 404,
              name: 'NotFoundError',
              message: 'Trusted device not found',
              details: {},
            },
          },
          { status: 404 }
        )
      )
    );
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getAllByRole('button', { name: 'Revoke trust' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Trusted device not found')).toBeInTheDocument();
  });
});
