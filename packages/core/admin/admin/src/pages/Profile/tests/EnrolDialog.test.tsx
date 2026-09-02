import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { EnrolDialog } from '../EnrolDialog';

const SECRET = 'JBSWY3DPEHPK3PXP';
const URI = `otpauth://totp/Strapi:test%40testing.com?secret=${SECRET}&issuer=Strapi`;
const CODES = ['ABCDE12345', 'FGHJK67890'];

describe('EnrolDialog', () => {
  beforeEach(() => {
    server.use(
      http.post('/admin/mfa/enrol', async ({ request }) => {
        const body = (await request.json()) as { password?: string };
        if (body.password !== 'Testing123!') {
          return HttpResponse.json(
            {
              error: {
                status: 400,
                name: 'ValidationError',
                message: 'Invalid credentials',
                details: {},
              },
            },
            { status: 400 }
          );
        }
        return HttpResponse.json({ data: { secret: SECRET, otpauthUri: URI } });
      }),
      http.post('/admin/mfa/enrol/verify', async ({ request }) => {
        const body = (await request.json()) as { code?: string };
        if (body.code !== '123456') {
          return HttpResponse.json(
            {
              error: { status: 400, name: 'ValidationError', message: 'Invalid code', details: {} },
            },
            { status: 400 }
          );
        }
        return HttpResponse.json({ data: { recoveryCodes: CODES } });
      }),
      http.post('/admin/mfa/recovery-codes/ack', () => new HttpResponse(null, { status: 204 }))
    );
  });

  it('walks password, scan, verify, recovery codes, acknowledge', async () => {
    const onClose = jest.fn();
    const { user } = render(<EnrolDialog open onClose={onClose} />);

    expect(
      screen.getByRole('dialog', { name: 'Enable two-factor authentication' })
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // step 2: the QR code and the manual key, never the raw URI as plain text
    expect(await screen.findByRole('img', { name: /scan this qr code/i })).toBeInTheDocument();
    expect(screen.getByText(SECRET)).toBeInTheDocument();
    expect(screen.queryByText(URI)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    // step 3: codes shown once, acknowledgement mandatory
    CODES.forEach((code) => expect(screen.getByText(code)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'I have saved my recovery codes' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /saved these codes/i }));
    await user.click(screen.getByRole('button', { name: 'I have saved my recovery codes' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows the credentials error on a wrong password and stays on step 1', async () => {
    const { user } = render(<EnrolDialog open onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Current password*'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password*')).toBeInTheDocument();
  });

  it('shows the generic error on a wrong code and stays on the scan step with the same secret', async () => {
    const { user } = render(<EnrolDialog open onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('Authentication code*'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Invalid code')).toBeInTheDocument();
    expect(screen.getByText(SECRET)).toBeInTheDocument();
  });

  it('forgets the secret when closed before finishing', async () => {
    const onClose = jest.fn();
    const { user, rerender } = render(<EnrolDialog open onClose={onClose} />);

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText(SECRET);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();

    rerender(<EnrolDialog open onClose={onClose} />);
    expect(screen.getByLabelText('Current password*')).toBeInTheDocument();
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
  });
});
