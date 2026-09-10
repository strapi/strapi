import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { Passkeys } from '../Passkeys';

import type { Passkey } from '../../../../../shared/contracts/mfa';

// Hoisted above every import by `babel-plugin-jest-hoist`, despite sitting below them: jsdom
// defines no `window.PublicKeyCredential`, so the real `browserSupportsWebAuthn()` returns false
// and neither the Add button nor a ceremony would ever be reachable.
jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: jest.fn(() => true),
  startRegistration: jest.fn(),
  startAuthentication: jest.fn(),
}));

const PASSKEYS: Passkey[] = [
  {
    id: '3',
    name: 'MacBook Touch ID',
    createdAt: '2026-09-01T10:14:00.000Z',
    lastUsedAt: '2026-09-08T09:00:00.000Z',
  },
  {
    id: '4',
    name: 'YubiKey 5C',
    createdAt: '2026-09-02T08:00:00.000Z',
    lastUsedAt: null,
  },
];

const OPTIONS = { challenge: 'Y2hhbGxlbmdl', rp: { id: 'localhost', name: 'Strapi' } };
const REGISTRATION = {
  id: 'credential-id',
  rawId: 'credential-id',
  type: 'public-key',
  clientExtensionResults: {},
  response: { attestationObject: 'YXR0', clientDataJSON: 'Y2xpZW50' },
};

const list = (passkeys: Passkey[]) =>
  http.get('/admin/mfa/passkeys', () => HttpResponse.json({ data: passkeys }));

describe('Passkeys', () => {
  beforeEach(() => {
    jest.mocked(browserSupportsWebAuthn).mockReturnValue(true);
    jest.mocked(startRegistration).mockReset();
  });

  it('lists passkeys with their name, added date and last use', async () => {
    server.use(list(PASSKEYS));
    render(<Passkeys />);

    expect(await screen.findByRole('heading', { name: 'Passkeys' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(screen.getByText('MacBook Touch ID')).toBeInTheDocument();
    expect(screen.getByText('YubiKey 5C')).toBeInTheDocument();
    expect(screen.getByText('Not yet')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent(/2026/);
    expect(screen.getAllByRole('button', { name: 'Remove passkey' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Add a passkey' })).toBeInTheDocument();
  });

  it('shows the empty state without a table', async () => {
    server.use(list([]));
    render(<Passkeys />);

    expect(
      await screen.findByText('No passkeys. Add one to sign in with your device instead of a code.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // adding one is still the point of the empty state
    expect(screen.getByRole('button', { name: 'Add a passkey' })).toBeInTheDocument();
  });

  it('replaces the Add button with a note in a browser without WebAuthn', async () => {
    jest.mocked(browserSupportsWebAuthn).mockReturnValue(false);
    server.use(list(PASSKEYS));
    render(<Passkeys />);

    expect(await screen.findByRole('heading', { name: 'Passkeys' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a passkey' })).not.toBeInTheDocument();
    expect(screen.getByText('This browser does not support passkeys.')).toBeInTheDocument();
    // existing rows are still listed and still removable from here
    expect(screen.getByText('MacBook Touch ID')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove passkey' })).toHaveLength(2);
  });

  it('removes one passkey after confirmation, toasts, and the list refreshes', async () => {
    let passkeys = PASSKEYS;
    server.use(
      http.get('/admin/mfa/passkeys', () => HttpResponse.json({ data: passkeys })),
      http.delete('/admin/mfa/passkeys/3', () => {
        passkeys = passkeys.filter((passkey) => passkey.id !== '3');
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<Passkeys />);
    await screen.findByText('MacBook Touch ID');

    await user.click(screen.getAllByRole('button', { name: 'Remove passkey' })[0]);
    expect(screen.getByRole('alertdialog', { name: 'Remove this passkey?' })).toHaveTextContent(
      /That device will no longer sign you in/
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Passkey removed')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('MacBook Touch ID')).not.toBeInTheDocument());
    expect(screen.getByText('YubiKey 5C')).toBeInTheDocument();
  });

  it('toasts the server message when a removal is refused', async () => {
    server.use(
      list(PASSKEYS),
      http.delete('/admin/mfa/passkeys/3', () =>
        HttpResponse.json(
          {
            error: {
              status: 404,
              name: 'NotFoundError',
              message: 'Passkey not found',
              details: {},
            },
          },
          { status: 404 }
        )
      )
    );
    const { user } = render(<Passkeys />);
    await screen.findByText('MacBook Touch ID');

    await user.click(screen.getAllByRole('button', { name: 'Remove passkey' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Passkey not found')).toBeInTheDocument();
  });

  it('shows the read error instead of the table or the empty state', async () => {
    server.use(
      http.get('/admin/mfa/passkeys', () =>
        HttpResponse.json(
          { error: { status: 500, name: 'InternalServerError', message: 'boom', details: {} } },
          { status: 500 }
        )
      )
    );
    render(<Passkeys />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/^No passkeys\./)).not.toBeInTheDocument();
  });

  it('registers a passkey: options, ceremony, then the name and the response', async () => {
    let passkeys: Passkey[] = [];
    const optionBodies: Array<Record<string, unknown>> = [];
    const registerBodies: Array<Record<string, unknown>> = [];
    server.use(
      http.get('/admin/mfa/passkeys', () => HttpResponse.json({ data: passkeys })),
      http.post('/admin/mfa/passkeys/options', async ({ request }) => {
        optionBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ data: OPTIONS });
      }),
      http.post('/admin/mfa/passkeys', async ({ request }) => {
        registerBodies.push((await request.json()) as Record<string, unknown>);
        passkeys = [
          {
            id: '9',
            name: 'MacBook Touch ID',
            createdAt: '2026-09-09T10:00:00.000Z',
            lastUsedAt: null,
          },
        ];
        return HttpResponse.json({ data: passkeys[0] });
      })
    );
    jest.mocked(startRegistration).mockResolvedValue(REGISTRATION as never);

    const { user } = render(<Passkeys />);
    await screen.findByText(/^No passkeys\./);

    await user.click(screen.getByRole('button', { name: 'Add a passkey' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a passkey' });
    await user.type(screen.getByLabelText('Passkey name*'), 'MacBook Touch ID');
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Add passkey' }));

    await waitFor(() => expect(registerBodies).toHaveLength(1));
    expect(optionBodies[0]).toEqual({ password: 'Testing123!', code: '123456' });
    expect(jest.mocked(startRegistration)).toHaveBeenCalledWith({ optionsJSON: OPTIONS });
    expect(registerBodies[0]).toEqual({ name: 'MacBook Touch ID', registration: REGISTRATION });
    expect(await screen.findByText('Passkey added')).toBeInTheDocument();
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(await screen.findByText('MacBook Touch ID')).toBeInTheDocument();
  });

  it('trims the name and keeps the submit disabled until every field is usable', async () => {
    const registerBodies: Array<Record<string, unknown>> = [];
    server.use(
      list([]),
      http.post('/admin/mfa/passkeys/options', () => HttpResponse.json({ data: OPTIONS })),
      http.post('/admin/mfa/passkeys', async ({ request }) => {
        registerBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({
          data: { id: '9', name: 'Phone', createdAt: '2026-09-09T10:00:00.000Z', lastUsedAt: null },
        });
      })
    );
    jest.mocked(startRegistration).mockResolvedValue(REGISTRATION as never);

    const { user } = render(<Passkeys />);
    await screen.findByText(/^No passkeys\./);
    await user.click(screen.getByRole('button', { name: 'Add a passkey' }));

    const submit = screen.getByRole('button', { name: 'Add passkey' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Passkey name*'), '  Phone  ');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Authentication code*'), '12345');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Authentication code*'), '6');
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    await waitFor(() => expect(registerBodies).toHaveLength(1));
    expect(registerBodies[0].name).toBe('Phone');
  });

  it('shows the server refusal inline and keeps the dialog open', async () => {
    server.use(
      list([]),
      http.post('/admin/mfa/passkeys/options', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Invalid credentials',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    const { user } = render(<Passkeys />);
    await screen.findByText(/^No passkeys\./);
    await user.click(screen.getByRole('button', { name: 'Add a passkey' }));
    await user.type(screen.getByLabelText('Passkey name*'), 'Phone');
    await user.type(screen.getByLabelText('Current password*'), 'wrong-password');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Add passkey' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add a passkey' })).toBeInTheDocument();
    expect(jest.mocked(startRegistration)).not.toHaveBeenCalled();
  });

  it('says nothing and re-enables the submit when the user dismisses the prompt', async () => {
    server.use(
      list([]),
      http.post('/admin/mfa/passkeys/options', () => HttpResponse.json({ data: OPTIONS }))
    );
    jest
      .mocked(startRegistration)
      .mockRejectedValue(Object.assign(new Error('dismissed'), { name: 'NotAllowedError' }));

    const { user } = render(<Passkeys />);
    await screen.findByText(/^No passkeys\./);
    await user.click(screen.getByRole('button', { name: 'Add a passkey' }));
    await user.type(screen.getByLabelText('Passkey name*'), 'Phone');
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Add passkey' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Add passkey' })).toBeEnabled());
    expect(screen.getByRole('dialog', { name: 'Add a passkey' })).toBeInTheDocument();
    expect(screen.queryByText(/could not create a passkey/)).not.toBeInTheDocument();
    expect(screen.queryByText(/already has a passkey/)).not.toBeInTheDocument();
  });

  it('says so when the authenticator is already registered, and generically otherwise', async () => {
    server.use(
      list([]),
      http.post('/admin/mfa/passkeys/options', () => HttpResponse.json({ data: OPTIONS }))
    );
    jest.mocked(startRegistration).mockRejectedValue(
      Object.assign(new Error('previously registered'), {
        name: 'WebAuthnError',
        code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
        cause: Object.assign(new Error('x'), { name: 'InvalidStateError' }),
      })
    );

    const { user } = render(<Passkeys />);
    await screen.findByText(/^No passkeys\./);
    await user.click(screen.getByRole('button', { name: 'Add a passkey' }));
    await user.type(screen.getByLabelText('Passkey name*'), 'Phone');
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Add passkey' }));

    expect(
      await screen.findByText('That device already has a passkey for this account.')
    ).toBeInTheDocument();

    jest
      .mocked(startRegistration)
      .mockRejectedValue(Object.assign(new Error('boom'), { name: 'UnknownError' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add passkey' }));

    expect(
      await screen.findByText('Your device could not create a passkey. Try again.')
    ).toBeInTheDocument();
  });
});
