import type { ReactElement } from 'react';

import { act, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useTypedDispatch } from '../../core/store/hooks';
import { useSessionKeepalive } from '../../hooks/useSessionKeepalive';
import {
  ADMIN_SESSION_CHANNEL,
  ADMIN_SESSION_MESSAGE_TYPE,
  ADMIN_SESSION_STORAGE_KEY,
} from '../../utils/adminSessionSync';
import { establishAdminSession } from '../../utils/establishAdminSession';
import {
  clearUnsavedChangesChecks,
  registerUnsavedChangesCheck,
} from '../../utils/unsavedChangesRegistry';
import { useAuth } from '../Auth';

jest.mock('../../hooks/useSessionKeepalive');

const TOKEN_A = 'token-user-a';
const TOKEN_B = 'token-user-b';

const USER_A = {
  id: 1,
  email: 'role-a@example.com',
  firstname: 'Role',
  lastname: 'A',
  username: 'role-a',
  preferedLanguage: 'en',
  roles: [{ id: 1 }],
};

const USER_B = {
  id: 2,
  email: 'role-b@example.com',
  firstname: 'Role',
  lastname: 'B',
  username: 'role-b',
  preferedLanguage: 'en',
  roles: [{ id: 2 }],
};

const PERMISSION_A = {
  action: 'plugin::content-manager.explorer.read',
  subject: 'api::featured.featured',
};

const PERMISSION_B = {
  action: 'admin::marketplace.read',
  subject: null,
};

/**
 * Identity is derived only from the bearer token. A refetch that still sends
 * token A cannot satisfy assertions for user B.
 */
const identityForAuthorization = (authorization: string | null) => {
  if (authorization === `Bearer ${TOKEN_B}`) {
    return 'b' as const;
  }

  return 'a' as const;
};

const mockIdentityHandlers = () => {
  server.use(
    http.get('/admin/users/me', ({ request }) => {
      const who = identityForAuthorization(request.headers.get('Authorization'));

      return HttpResponse.json({
        data: who === 'a' ? USER_A : USER_B,
      });
    }),
    http.get('/admin/users/me/permissions', ({ request }) => {
      const who = identityForAuthorization(request.headers.get('Authorization'));

      return HttpResponse.json({
        data: who === 'a' ? [PERMISSION_A] : [PERMISSION_B],
      });
    })
  );
};

const setAuthCookie = (token: string) => {
  document.cookie = `jwtToken=${encodeURIComponent(token)}; Path=/admin`;
};

const clearAuthCookie = () => {
  document.cookie = 'jwtToken=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = 'jwtToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
};

/** What another document publishes after it has already written the new session. */
const emitExternalSessionBroadcast = () => {
  const channel = new BroadcastChannel(ADMIN_SESSION_CHANNEL);
  channel.postMessage({
    type: ADMIN_SESSION_MESSAGE_TYPE,
    tabId: 'external-tab',
  });
  channel.close();
};

const emitExternalStorageSignal = () => {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: ADMIN_SESSION_STORAGE_KEY,
      newValue: `external-${Date.now()}`,
    })
  );
};

const IdentityProbe = () => {
  const permissions = useAuth('IdentityProbe', (state) => state.permissions);
  const user = useAuth('IdentityProbe', (state) => state.user);
  const login = useAuth('IdentityProbe', (state) => state.login);
  const isLoading = useAuth('IdentityProbe', (state) => state.isLoading);

  return (
    <div>
      <div data-testid="identity-loading">{String(isLoading)}</div>
      <div data-testid="identity-email">{user?.email ?? ''}</div>
      <div data-testid="identity-actions">
        {permissions.map((permission) => permission.action).join(',')}
      </div>
      <button
        type="button"
        onClick={() => {
          void login({
            email: USER_B.email,
            password: 'Testing123!',
            rememberMe: true,
          });
        }}
      >
        login-as-b
      </button>
    </div>
  );
};

const EstablishSessionProbe = () => {
  const dispatch = useTypedDispatch();

  return (
    <>
      <IdentityProbe />
      <button
        type="button"
        onClick={() => {
          establishAdminSession(dispatch, { token: TOKEN_B });
        }}
      >
        establish-session-b
      </button>
    </>
  );
};

const waitForUserA = async () => {
  await waitFor(() => expect(screen.getByTestId('identity-loading')).toHaveTextContent('false'));
  expect(screen.getByTestId('identity-email')).toHaveTextContent(USER_A.email);
  expect(screen.getByTestId('identity-actions')).toHaveTextContent(PERMISSION_A.action);
  expect(screen.getByTestId('identity-actions')).not.toHaveTextContent(PERMISSION_B.action);
};

const waitForUserB = async () => {
  await waitFor(() => expect(screen.getByTestId('identity-email')).toHaveTextContent(USER_B.email));
  expect(screen.getByTestId('identity-actions')).toHaveTextContent(PERMISSION_B.action);
  expect(screen.getByTestId('identity-actions')).not.toHaveTextContent(PERMISSION_A.action);
};

const renderIdentity = (ui: ReactElement = <IdentityProbe />) =>
  render(ui, {
    providerOptions: {
      permissions: () => [],
    },
  });

describe('AuthProvider session identity', () => {
  beforeEach(() => {
    window.localStorage.setItem('jwtToken', JSON.stringify(TOKEN_A));
    window.localStorage.setItem('isLoggedIn', 'true');
    mockIdentityHandlers();
  });

  afterEach(() => {
    window.localStorage.clear();
    clearAuthCookie();
  });

  it('refetches warm identity with the new bearer token after password login', async () => {
    server.use(
      http.post('/admin/login', () =>
        HttpResponse.json({
          data: {
            token: TOKEN_B,
            user: USER_B,
          },
        })
      )
    );

    const { user } = renderIdentity();

    await waitForUserA();

    await user.click(screen.getByRole('button', { name: 'login-as-b' }));

    await waitForUserB();
    expect(window.localStorage.getItem('jwtToken')).toBe(JSON.stringify(TOKEN_B));
  });

  it('loads identity after password login when no user was cached', async () => {
    window.localStorage.removeItem('jwtToken');
    window.localStorage.removeItem('isLoggedIn');

    server.use(
      http.post('/admin/login', () =>
        HttpResponse.json({
          data: {
            token: TOKEN_B,
            user: USER_B,
          },
        })
      )
    );

    const { user } = renderIdentity();

    expect(screen.getByTestId('identity-email')).toHaveTextContent('');

    await user.click(screen.getByRole('button', { name: 'login-as-b' }));

    await waitForUserB();
  });

  it('refetches the current user and permissions after a new session is established without persist', async () => {
    const { user } = renderIdentity(<EstablishSessionProbe />);

    await waitForUserA();

    await user.click(screen.getByRole('button', { name: 'establish-session-b' }));

    await waitForUserB();
    expect(window.localStorage.getItem('jwtToken')).toBe(null);
  });

  it('refetches identity under the new persisted token when another tab changes the session', async () => {
    renderIdentity();

    await waitForUserA();

    window.localStorage.setItem('jwtToken', JSON.stringify(TOKEN_B));
    act(() => {
      emitExternalSessionBroadcast();
    });

    await waitForUserB();
  });

  it('refetches identity under a cookie session when another tab drops the persisted token', async () => {
    renderIdentity();

    await waitForUserA();

    window.localStorage.removeItem('jwtToken');
    setAuthCookie(TOKEN_B);
    act(() => {
      emitExternalSessionBroadcast();
    });

    await waitForUserB();
    expect(window.localStorage.getItem('jwtToken')).toBe(null);
  });

  it('refetches a cookie-only session from a storage signal when BroadcastChannel is unavailable', async () => {
    const originalBroadcastChannel = globalThis.BroadcastChannel;
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    window.localStorage.removeItem('jwtToken');
    setAuthCookie(TOKEN_A);

    try {
      expect(typeof BroadcastChannel).toBe('undefined');

      renderIdentity();

      await waitForUserA();

      setAuthCookie(TOKEN_B);
      act(() => {
        emitExternalStorageSignal();
      });

      await waitForUserB();
      expect(window.localStorage.getItem('jwtToken')).toBe(null);
    } finally {
      Object.defineProperty(globalThis, 'BroadcastChannel', {
        configurable: true,
        writable: true,
        value: originalBroadcastChannel,
      });
    }
  });
});

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
