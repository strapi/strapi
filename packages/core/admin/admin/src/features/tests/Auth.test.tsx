import { act, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useSessionKeepalive } from '../../hooks/useSessionKeepalive';
import { triggerSessionExpired } from '../../utils/getFetchClient';
import {
  clearUnsavedChangesChecks,
  registerUnsavedChangesCheck,
} from '../../utils/unsavedChangesRegistry';
import { useAuth } from '../Auth';

jest.mock('../../hooks/useSessionKeepalive');

const TOKEN = 'test-access-token';

const AuthProbe = () => {
  const token = useAuth('AuthProbe', (state) => state.token);

  return <span data-testid="token">{token ?? 'logged-out'}</span>;
};

/**
 * The options `AuthProvider` last handed to the keepalive hook, so tests can
 * drive session-dead directly instead of racing real timers / network.
 */
const getKeepaliveOptions = () => {
  const options = jest.mocked(useSessionKeepalive).mock.calls.at(-1)?.[0];

  if (!options) {
    throw new Error('AuthProvider did not arm the session keepalive hook');
  }

  return options;
};

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.setItem('jwtToken', JSON.stringify(TOKEN));
  });

  afterEach(() => {
    clearUnsavedChangesChecks();
    window.localStorage.clear();
  });

  describe('session-dead with unsaved changes', () => {
    it('does not offer cancel when the server has ended the session', async () => {
      registerUnsavedChangesCheck('form', () => true);

      render(<AuthProbe />);

      act(() => {
        getKeepaliveOptions().onSessionDead?.();
      });

      const dialog = await screen.findByRole('alertdialog');

      expect(dialog).toHaveTextContent(/session has ended and can't be resumed/i);
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('logs out without prompting when there is nothing unsaved', async () => {
      render(<AuthProbe />);

      act(() => {
        getKeepaliveOptions().onSessionDead?.();
      });

      await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('logged-out'));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('voluntary logout with unsaved changes', () => {
    it('lets the user cancel and keep their edits', async () => {
      registerUnsavedChangesCheck('form', () => true);

      const LogoutProbe = () => {
        const logout = useAuth('LogoutProbe', (state) => state.logout);
        const token = useAuth('LogoutProbeToken', (state) => state.token);

        return (
          <>
            <button type="button" onClick={() => void logout()}>
              Log out
            </button>
            <span data-testid="token">{token ?? 'logged-out'}</span>
          </>
        );
      };

      const { user } = render(<LogoutProbe />);

      await user.click(screen.getByRole('button', { name: /log out/i }));

      const dialog = await screen.findByRole('alertdialog');

      expect(dialog).toHaveTextContent(/unsaved changes/i);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(screen.getByTestId('token')).toHaveTextContent(TOKEN);
    });
  });

  /**
   * `triggerSessionExpired` latches on a module global so one dead session produces one prompt,
   * and only a fresh login re-arms it. On an instance that enforces 2FA the second factor *is*
   * the login, so a latch re-armed solely by `login` stays stuck after the first expiry: the
   * next one is swallowed, leaving the user on a panel where every request 401s in silence.
   */
  describe('session-expired latch', () => {
    const SESSION = {
      token: 'mfa-session-token',
      user: { id: 1, email: 'test@testing.com', firstname: 'T', lastname: 'U', roles: [] },
    };

    const LoginMfaProbe = () => {
      const loginMfa = useAuth('LoginMfaProbe', (state) => state.loginMfa);
      const token = useAuth('LoginMfaProbeToken', (state) => state.token);

      return (
        <>
          <button
            type="button"
            onClick={() =>
              void loginMfa({ code: '123456', challengeToken: 'challenge', rememberMe: false })
            }
          >
            Complete 2FA
          </button>
          <span data-testid="token">{token ?? 'logged-out'}</span>
        </>
      );
    };

    it('expires a session that a second-factor login started', async () => {
      server.use(http.post('/admin/login/mfa', () => HttpResponse.json({ data: SESSION })));

      const { user } = render(<LoginMfaProbe />);

      act(() => {
        triggerSessionExpired();
      });
      await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('logged-out'));

      await user.click(screen.getByRole('button', { name: /complete 2fa/i }));
      await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent(SESSION.token));

      // The second dead session must still log the user out. It does not if `loginMfa` left the
      // latch set from the first one.
      act(() => {
        triggerSessionExpired();
      });
      await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('logged-out'));
    });
  });
});
