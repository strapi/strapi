import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useTypedDispatch } from '../../core/store/hooks';
import { establishAdminSession } from '../../utils/establishAdminSession';
import { useAuth } from '../Auth';

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

let currentUser: 'a' | 'b' = 'a';

const mockIdentityHandlers = () => {
  server.use(
    http.get('/admin/users/me', () =>
      HttpResponse.json({
        data: currentUser === 'a' ? USER_A : USER_B,
      })
    ),
    http.get('/admin/users/me/permissions', () =>
      HttpResponse.json({
        data: currentUser === 'a' ? [PERMISSION_A] : [PERMISSION_B],
      })
    )
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
          currentUser = 'b';
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

describe('AuthProvider session identity', () => {
  beforeEach(() => {
    currentUser = 'a';
    window.localStorage.setItem('jwtToken', JSON.stringify(TOKEN_A));
    window.localStorage.setItem('isLoggedIn', 'true');
    mockIdentityHandlers();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('refetches the current user and permissions after login without a page reload', async () => {
    server.use(
      http.post('/admin/login', () => {
        currentUser = 'b';
        return HttpResponse.json({
          data: {
            token: TOKEN_B,
            user: USER_B,
          },
        });
      })
    );

    const { user } = render(<IdentityProbe />, {
      providerOptions: {
        permissions: () => [],
      },
    });

    await waitForUserA();

    await user.click(screen.getByRole('button', { name: 'login-as-b' }));

    await waitForUserB();
  });

  it('refetches the current user and permissions after a new session is established without persist', async () => {
    const { user } = render(<EstablishSessionProbe />, {
      providerOptions: {
        permissions: () => [],
      },
    });

    await waitForUserA();

    await user.click(screen.getByRole('button', { name: 'establish-session-b' }));

    await waitForUserB();
  });
});
