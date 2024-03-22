import { render, screen } from '@tests/utils';
import { Link, Route, Routes, useLocation } from 'react-router-dom';

import { PrivateRoute } from '../PrivateRoute';

jest.mock('../../services/auth', () => ({
  ...jest.requireActual('../../services/auth'),
  useRenewTokenMutation: jest.fn(() => [
    jest.fn().mockResolvedValue({ data: { token: 'access-token' } }),
  ]),
}));

const ProtectedPage = () => {
  return <div>You are authenticated</div>;
};

const LoginPage = () => {
  return <div>Please login</div>;
};

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <div>
      <dl>
        <dt>location.pathname</dt>
        <dd>{location.pathname}</dd>
        <dt>location.search</dt>
        <dd>{location.search}</dd>
      </dl>
      <Link
        to={{
          pathname: 'protected',
          search: 'hello=world',
        }}
      >
        Go to protected
      </Link>
    </div>
  );
};

describe('PrivateRoute', () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  /**
   * TODO: investigate why this test keeps acting.
   */
  it.skip('Authenticated users should be able to access protected routes', async () => {
    // Login
    window.localStorage.setItem('jwtToken', JSON.stringify('access-token'));
    render(
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route
          path="/protected"
          element={
            <PrivateRoute>
              <ProtectedPage />
            </PrivateRoute>
          }
        />
      </Routes>,
      {
        initialEntries: ['/protected'],
        providerOptions: {
          permissions: () => undefined,
        },
      }
    );

    // Should see the protected route
    expect(await screen.findByText('You are authenticated'));
  });

  it('Unauthenticated users should not be able to access protected routes and get redirected', async () => {
    const { user } = render(
      <>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route
            path="/protected"
            element={
              <PrivateRoute>
                <ProtectedPage />
              </PrivateRoute>
            }
          />
        </Routes>
        <LocationDisplay />
      </>,
      {
        initialEntries: ['/protected'],
      }
    );

    await screen.findByText('/auth/login');

    const searchParams1 = new URLSearchParams();
    searchParams1.append('redirectTo', '/protected');

    // No `redirectTo` in the search params
    expect(screen.getByText(`?${searchParams1.toString()}`)).toBeInTheDocument();
    expect(screen.getByText('Please login')).toBeInTheDocument();

    // Visit /settings/application-infos (have search params)
    await user.click(screen.getByRole('link', { name: 'Go to protected' }));

    await screen.findByText('/auth/login');

    const searchParams2 = new URLSearchParams();
    searchParams2.append('redirectTo', '/protected?hello=world');

    // Should preserve search params
    expect(screen.getByText(`?${searchParams2.toString()}`)).toBeInTheDocument();

    expect(screen.getByText('Please login')).toBeInTheDocument();
  });
});
