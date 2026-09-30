import { act, render, screen, waitFor } from '@tests/utils';

import { useSessionKeepalive } from '../../hooks/useSessionKeepalive';
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
});
