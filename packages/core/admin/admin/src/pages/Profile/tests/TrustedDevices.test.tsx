import { within } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Remove all' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Remove (?!all)/ })).toHaveLength(2);
    // Each row's button names its device, so a screen reader can tell them apart.
    expect(screen.getByRole('button', { name: 'Remove Chrome on macOS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Unknown device' })).toBeInTheDocument();
  });

  it('puts Remove all in the block header beside the title, and keeps row actions out of it', async () => {
    server.use(list(DEVICES));
    render(<TrustedDevices />);

    const header = await screen.findByRole('group', { name: 'Trusted devices' });
    expect(within(header).getByRole('button', { name: 'Remove all' })).toBeInTheDocument();
    expect(
      within(header).queryByRole('button', { name: /^Remove (?!all)/ })
    ).not.toBeInTheDocument();
    // Row actions stay focusable: hidden with opacity, never display: none or disabled.
    const rowButton = screen.getByRole('button', { name: 'Remove Chrome on macOS' });
    expect(rowButton).toBeEnabled();
  });

  it('shows the empty state without a table or a Remove all button', async () => {
    server.use(list([]));
    render(<TrustedDevices />);

    expect(
      await screen.findByText(/^No trusted devices\. You can trust a browser/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove all' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('removes one device after confirmation, toasts, and the list refreshes', async () => {
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

    await user.click(screen.getAllByRole('button', { name: /^Remove (?!all)/ })[0]);
    expect(screen.getByRole('alertdialog', { name: 'Remove trusted device?' })).toHaveTextContent(
      /Chrome on macOS will ask for a code at its next login\. It stays logged in until then\./
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Trusted device removed.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Chrome on macOS')).not.toBeInTheDocument());
    expect(screen.getByText('Unknown device')).toBeInTheDocument();
  });

  it('removes every device after confirmation', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Remove all' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Remove all' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove all' }));

    expect(await screen.findByText('Trusted devices removed.')).toBeInTheDocument();
    expect(await screen.findByText(/^No trusted devices\./)).toBeInTheDocument();
  });

  it('the confirmation for a non-current row names the device for a code', async () => {
    server.use(list(DEVICES));
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getAllByRole('button', { name: /^Remove (?!all)/ })[1]);
    expect(screen.getByRole('alertdialog', { name: 'Remove trusted device?' })).toHaveTextContent(
      'Unknown device will ask for a code at its next login. It stays logged in until then.'
    );
  });

  it('the remove-all confirmation says every device will ask for a code', async () => {
    server.use(list(DEVICES.map((device) => ({ ...device, current: false }))));
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getByRole('button', { name: 'Remove all' }));
    expect(screen.getByRole('alertdialog', { name: 'Remove all' })).toHaveTextContent(
      'Every device will ask for a code at its next login. They stay logged in until then.'
    );
  });

  it('toasts the server message when a removal is refused', async () => {
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

    await user.click(screen.getAllByRole('button', { name: /^Remove (?!all)/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Trusted device not found')).toBeInTheDocument();
    // Nothing optimistic: a refused removal leaves the list truthful.
    expect(screen.getByText('Chrome on macOS')).toBeInTheDocument();
  });

  it('toasts the server message when removing every device is refused, and keeps the list', async () => {
    server.use(
      list(DEVICES),
      http.delete('/admin/mfa/trusted-devices', () =>
        HttpResponse.json(
          { error: { status: 500, name: 'InternalServerError', message: 'boom', details: {} } },
          { status: 500 }
        )
      )
    );
    const { user } = render(<TrustedDevices />);
    await screen.findByText('Chrome on macOS');

    await user.click(screen.getByRole('button', { name: 'Remove all' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove all' })
    );

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('Trusted devices removed.')).not.toBeInTheDocument();
    expect(screen.getByText('Chrome on macOS')).toBeInTheDocument();
  });

  /** The `!error &&` guard exists so a stale table never renders underneath an error. */
  it('shows the read error instead of the table or the empty state', async () => {
    server.use(
      http.get('/admin/mfa/trusted-devices', () =>
        HttpResponse.json(
          { error: { status: 500, name: 'InternalServerError', message: 'boom', details: {} } },
          { status: 500 }
        )
      )
    );
    render(<TrustedDevices />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/^No trusted devices\./)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove all' })).not.toBeInTheDocument();
  });
});
