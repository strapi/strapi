import { act, render, screen, waitFor } from '@tests/utils';

import { useIdleSessionLogout } from '../../hooks/useIdleSessionLogout';
import {
  clearUnsavedChangesChecks,
  registerUnsavedChangesCheck,
} from '../../utils/unsavedChangesRegistry';
import { useAuth } from '../Auth';

jest.mock('../../hooks/useIdleSessionLogout');

const TOKEN = 'test-access-token';

const AuthProbe = () => {
  const token = useAuth('AuthProbe', (state) => state.token);

  return <span data-testid="token">{token ?? 'logged-out'}</span>;
};

/**
 * The options `AuthProvider` last handed to the idle session hook, so tests can
 * drive expiry directly instead of racing the access token's real timers.
 */
const getIdleSessionOptions = () => {
  const options = jest.mocked(useIdleSessionLogout).mock.calls.at(-1)?.[0];

  if (!options) {
    throw new Error('AuthProvider did not arm the idle session hook');
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

  describe('session expiry with unsaved changes', () => {
    it('lets the user cancel an idle logout and keep their edits', async () => {
      registerUnsavedChangesCheck('form', () => true);

      const { user } = render(<AuthProbe />);

      act(() => {
        getIdleSessionOptions().onExpired();
      });

      expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(screen.getByTestId('token')).toHaveTextContent(TOKEN);
    });

    it('does not offer cancel when the server has ended the session', async () => {
      registerUnsavedChangesCheck('form', () => true);

      render(<AuthProbe />);

      act(() => {
        getIdleSessionOptions().onSessionDead?.();
      });

      expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('logs out without prompting when there is nothing unsaved', async () => {
      render(<AuthProbe />);

      act(() => {
        getIdleSessionOptions().onExpired();
      });

      await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('logged-out'));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
