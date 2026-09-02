import { render, server, screen, fireEvent } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { MfaChallenge } from '../MfaChallenge';

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

const STATE = { challengeToken: 'a'.repeat(64), expiresIn: 300, rememberMe: false };

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
});
