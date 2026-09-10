import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { render, server, screen, fireEvent, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { MfaChallenge } from '../MfaChallenge';

// jsdom defines no `window.PublicKeyCredential`, so the real `browserSupportsWebAuthn()` returns
// false and the passkey button would never render. Mocking the module also lets each test drive
// the ceremony's outcome without a real authenticator. Hoisted above the imports by
// `babel-plugin-jest-hoist`, despite sitting below them here.
jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: jest.fn(() => true),
  startAuthentication: jest.fn(),
  startRegistration: jest.fn(),
}));

// `user.click` on a submit button relies on `HTMLFormElement.requestSubmit`, which jsdom doesn't
// implement, so it never fires the form's submit handler here. `fireEvent.click` dispatches the
// click directly and works (see Login.test.tsx for the same workaround). Centralised here so the
// five submit sites below don't each carry their own copy of this explanation.
const submitVerify = () => fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <pre data-testid="probe">{pathname}</pre>;
};

// Observes `useLocation().state` from inside the same route as `MfaChallenge`, to prove the
// component clears the router state (see MfaChallenge.tsx's history-replace effect) rather than
// leaving the challenge token sitting in `window.history.state.usr`.
const MfaStateProbe = () => {
  const { state } = useLocation();
  return <pre data-testid="state-probe">{JSON.stringify(state)}</pre>;
};

const STATE = {
  challengeToken: 'a'.repeat(64),
  expiresIn: 300,
  rememberMe: false,
  trustedDeviceDays: null,
  passkeyAvailable: false,
};

const renderChallenge = (state: object | null = STATE, search = '') =>
  render(
    <Routes>
      <Route
        path="/auth/mfa"
        element={
          <>
            <MfaChallenge />
            <MfaStateProbe />
          </>
        }
      />
      <Route path="/auth/login" element={<LocationProbe />} />
      <Route path="/" element={<LocationProbe />} />
      <Route path="/content-manager" element={<LocationProbe />} />
    </Routes>,
    { initialEntries: [{ pathname: '/auth/mfa', search, state }] }
  );

describe('MfaChallenge', () => {
  beforeEach(() => {
    jest.mocked(browserSupportsWebAuthn).mockReturnValue(true);
    jest.mocked(startAuthentication).mockReset();
  });

  it('renders one code field that accepts either factor, and a way back to login', () => {
    renderChallenge();

    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
    const input = screen.getByLabelText('Authentication code*');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('maxlength', '32');
    expect(screen.getByText(/recovery code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute(
      'href',
      '/auth/login'
    );
  });

  it('returns to login when opened without a challenge in router state', () => {
    renderChallenge(null);

    expect(screen.getByTestId('probe')).toHaveTextContent('/auth/login');
  });

  it('requires a code of at least 6 characters', async () => {
    const { user } = renderChallenge();

    submitVerify();
    expect(await screen.findByText('This value is required.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Authentication code*'), '123');
    submitVerify();
    expect(await screen.findByText(/too short/i)).toBeInTheDocument();
  });

  it('clears the challenge from router state on mount, but still submits it to /login/mfa', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post('/admin/login/mfa', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          data: {
            token: 'session-token',
            user: { id: 1, email: 'test@testing.com', firstname: 'T', lastname: 'U', roles: [] },
          },
        });
      })
    );

    const { user } = renderChallenge(
      { ...STATE, rememberMe: true },
      '?redirectTo=%2Fcontent-manager'
    );

    // The history-replace effect runs right after mount: by the time this resolves, the router's
    // own `location.state` is gone, even though `MfaChallenge` still has the challenge in memory
    // (captured on first render) and the URL/search are unchanged.
    expect(await screen.findByTestId('state-probe')).toHaveTextContent('null');

    await user.type(screen.getByLabelText('Authentication code*'), '123 456');
    submitVerify();

    expect(await screen.findByTestId('probe')).toHaveTextContent('/content-manager');
    // The original challengeToken from router state still reaches the server — proving the
    // in-memory copy, not `location.state`, is what the submit actually used.
    expect(body).toMatchObject({
      challengeToken: 'a'.repeat(64),
      code: '123 456',
      rememberMe: true,
    });
    expect(typeof body?.deviceId).toBe('string');
    // rememberMe: true persists the session token the way the existing login reducer does
    expect(window.localStorage.getItem('jwtToken')).toBe(JSON.stringify('session-token'));
  });

  it('shows the generic server error for a wrong code and keeps the form usable', async () => {
    server.use(
      http.post('/admin/login/mfa', () =>
        HttpResponse.json(
          { error: { status: 400, name: 'ValidationError', message: 'Invalid code', details: {} } },
          { status: 400 }
        )
      )
    );
    const { user } = renderChallenge();

    await user.type(screen.getByLabelText('Authentication code*'), '000000');
    submitVerify();

    // The design system keeps a permanent, empty `role="alert"` live region mounted for toast
    // announcements, so `findByRole('alert')` resolves against that instead of waiting for this
    // banner. Wait on the actual text, then confirm it is the alert-role element.
    const errorMessage = await screen.findByText('Invalid code');
    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled();
  });

  it('shows the throttle message on 429', async () => {
    server.use(
      http.post('/admin/login/mfa', () =>
        HttpResponse.json(
          {
            error: {
              status: 429,
              name: 'RateLimitError',
              message: 'Too many requests, please try again later.',
              details: {},
            },
          },
          { status: 429 }
        )
      )
    );
    const { user } = renderChallenge();

    await user.type(screen.getByLabelText('Authentication code*'), '000000');
    submitVerify();

    const errorMessage = await screen.findByText(/Too many requests/);
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  it('offers "Trust this device" only when the organisation allows it', () => {
    const withTrust = renderChallenge({ ...STATE, trustedDeviceDays: 30 });
    const box = screen.getByRole('checkbox', { name: 'Trust this device for 30 days' });
    expect(box).not.toBeChecked();
    withTrust.unmount();

    renderChallenge(STATE);
    expect(screen.queryByRole('checkbox', { name: /Trust this device/ })).not.toBeInTheDocument();
  });

  it('uses the singular when the period is one day', () => {
    renderChallenge({ ...STATE, trustedDeviceDays: 1 });
    expect(
      screen.getByRole('checkbox', { name: 'Trust this device for 1 day' })
    ).toBeInTheDocument();
  });

  it('sends trustDevice only when the box is ticked', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post('/admin/login/mfa', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({
          data: {
            token: 'session-token',
            user: { id: 1, email: 'test@testing.com', firstname: 'T', lastname: 'U', roles: [] },
          },
        });
      })
    );

    const unticked = renderChallenge({ ...STATE, trustedDeviceDays: 30 });
    await unticked.user.type(screen.getByLabelText('Authentication code*'), '123456');
    submitVerify();
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].trustDevice).toBe(false);
    unticked.unmount();

    const ticked = renderChallenge({ ...STATE, trustedDeviceDays: 30 });
    await ticked.user.click(
      screen.getByRole('checkbox', { name: 'Trust this device for 30 days' })
    );
    await ticked.user.type(screen.getByLabelText('Authentication code*'), '123456');
    submitVerify();
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].trustDevice).toBe(true);
  });

  it('still renders a challenge whose state predates the trust period field', () => {
    renderChallenge({ challengeToken: 'a'.repeat(64), expiresIn: 300, rememberMe: false });

    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Trust this device/ })).not.toBeInTheDocument();
  });

  const OPTIONS = { challenge: 'Y2hhbGxlbmdl', rpId: 'localhost', allowCredentials: [] };
  const ASSERTION = {
    id: 'credential-id',
    rawId: 'credential-id',
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      authenticatorData: 'YXV0aA',
      clientDataJSON: 'Y2xpZW50',
      signature: 'c2ln',
    },
  };
  const SESSION = {
    data: {
      token: 'session-token',
      user: { id: 1, email: 'test@testing.com', firstname: 'T', lastname: 'U', roles: [] },
    },
  };

  it('offers the passkey button only when the challenge says a passkey is available', () => {
    const without = renderChallenge(STATE);
    expect(screen.queryByRole('button', { name: 'Use a passkey' })).not.toBeInTheDocument();
    without.unmount();

    renderChallenge({ ...STATE, passkeyAvailable: true });
    expect(screen.getByRole('button', { name: 'Use a passkey' })).toBeInTheDocument();
  });

  it('hides the passkey button in a browser without WebAuthn', () => {
    jest.mocked(browserSupportsWebAuthn).mockReturnValue(false);
    renderChallenge({ ...STATE, passkeyAvailable: true });

    expect(screen.queryByRole('button', { name: 'Use a passkey' })).not.toBeInTheDocument();
    // the code path is untouched
    expect(screen.getByLabelText('Authentication code*')).toBeInTheDocument();
  });

  it('runs the ceremony and sends the assertion with rememberMe and trustDevice', async () => {
    const optionBodies: Array<Record<string, unknown>> = [];
    const verifyBodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post('/admin/login/mfa/webauthn/options', async ({ request }) => {
        optionBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ data: OPTIONS });
      }),
      http.post('/admin/login/mfa/webauthn', async ({ request }) => {
        verifyBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(SESSION);
      })
    );
    jest.mocked(startAuthentication).mockResolvedValue(ASSERTION as never);

    const { user } = renderChallenge({
      ...STATE,
      rememberMe: true,
      trustedDeviceDays: 30,
      passkeyAvailable: true,
    });

    await user.click(screen.getByRole('checkbox', { name: 'Trust this device for 30 days' }));
    await user.click(screen.getByRole('button', { name: 'Use a passkey' }));

    await waitFor(() => expect(verifyBodies).toHaveLength(1));
    expect(optionBodies[0]).toEqual({ challengeToken: 'a'.repeat(64) });
    // the options object reaches the browser helper verbatim, under `optionsJSON`
    expect(jest.mocked(startAuthentication)).toHaveBeenCalledWith({ optionsJSON: OPTIONS });
    expect(verifyBodies[0]).toMatchObject({
      challengeToken: 'a'.repeat(64),
      assertion: ASSERTION,
      rememberMe: true,
      trustDevice: true,
    });
    expect(typeof verifyBodies[0].deviceId).toBe('string');
    expect(await screen.findByTestId('probe')).toHaveTextContent('/');
    expect(window.localStorage.getItem('jwtToken')).toBe(JSON.stringify('session-token'));
  });

  it('sends trustDevice false on the passkey path when the box is untouched', async () => {
    const verifyBodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post('/admin/login/mfa/webauthn/options', () => HttpResponse.json({ data: OPTIONS })),
      http.post('/admin/login/mfa/webauthn', async ({ request }) => {
        verifyBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(SESSION);
      })
    );
    jest.mocked(startAuthentication).mockResolvedValue(ASSERTION as never);

    const { user } = renderChallenge({
      ...STATE,
      trustedDeviceDays: 30,
      passkeyAvailable: true,
    });

    await user.click(screen.getByRole('button', { name: 'Use a passkey' }));

    await waitFor(() => expect(verifyBodies).toHaveLength(1));
    expect(verifyBodies[0].trustDevice).toBe(false);
  });

  it('says nothing and re-enables the button when the user dismisses the prompt', async () => {
    server.use(
      http.post('/admin/login/mfa/webauthn/options', () => HttpResponse.json({ data: OPTIONS })),
      http.post('/admin/login/mfa/webauthn', () => HttpResponse.json(SESSION))
    );
    jest
      .mocked(startAuthentication)
      .mockRejectedValue(Object.assign(new Error('dismissed'), { name: 'NotAllowedError' }));

    const { user } = renderChallenge({ ...STATE, passkeyAvailable: true });
    await user.click(screen.getByRole('button', { name: 'Use a passkey' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Use a passkey' })).toBeEnabled()
    );
    expect(
      screen.queryByText(/Your device could not complete the passkey check/)
    ).not.toBeInTheDocument();
    // still on the challenge screen, with the code field usable
    expect(screen.getByLabelText('Authentication code*')).toBeInTheDocument();
  });

  it('shows one line when the ceremony fails for any other reason', async () => {
    server.use(
      http.post('/admin/login/mfa/webauthn/options', () => HttpResponse.json({ data: OPTIONS }))
    );
    jest
      .mocked(startAuthentication)
      .mockRejectedValue(Object.assign(new Error('boom'), { name: 'UnknownError' }));

    const { user } = renderChallenge({ ...STATE, passkeyAvailable: true });
    await user.click(screen.getByRole('button', { name: 'Use a passkey' }));

    expect(
      await screen.findByText(
        'Your device could not complete the passkey check. Try again, or enter a code instead.'
      )
    ).toBeInTheDocument();
  });

  it('shows the server message when the options call or the verify call is refused', async () => {
    server.use(
      http.post('/admin/login/mfa/webauthn/options', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Could not verify that passkey.',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    const { user } = renderChallenge({ ...STATE, passkeyAvailable: true });
    await user.click(screen.getByRole('button', { name: 'Use a passkey' }));

    const message = await screen.findByText('Could not verify that passkey.');
    expect(message).toHaveAttribute('role', 'alert');
    expect(jest.mocked(startAuthentication)).not.toHaveBeenCalled();
  });

  it('still renders a challenge whose state predates the passkey field', () => {
    renderChallenge({
      challengeToken: 'a'.repeat(64),
      expiresIn: 300,
      rememberMe: false,
      trustedDeviceDays: null,
    });

    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use a passkey' })).not.toBeInTheDocument();
  });
});
