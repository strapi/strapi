import { act, render, screen, waitFor } from '@tests/utils';
import { History, Location } from 'history';
import { Route } from 'react-router-dom';

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

describe('PrivateRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('Authenticated users should be able to access protected routes', async () => {
    // Login
    window.localStorage.setItem('jwtToken', JSON.stringify('access-token'));

    render(
      <>
        <Route path="/auth/login" component={LoginPage} />
        <PrivateRoute path="/">
          <ProtectedPage />
        </PrivateRoute>
      </>,
      {
        initialEntries: ['/protected'],
      }
    );

    // Should see the protected route
    expect(await screen.findByText('You are authenticated'));
  });

  it.only('Unauthenticated users should not be able to access protected routes and get redirected', async () => {
    let testLocation: Location = null!;
    let testHistory: History = null!;

    render(
      <>
        <Route path="/auth/login" component={LoginPage} />
        <PrivateRoute path="/protected">
          <ProtectedPage />
        </PrivateRoute>
        <Route
          path="*"
          render={({ history, location }) => {
            testLocation = location;
            testHistory = history;
            return null;
          }}
        />
      </>,
      {
        initialEntries: ['/protected'],
      }
    );

    await waitFor(() => expect(testLocation.pathname).toBe('/auth/login'));

    // No `redirectTo` in the search params
    expect(new URLSearchParams(testLocation.search).get('redirectTo')).toBe('/protected');
    expect(screen.getByText('Please login')).toBeInTheDocument();

    // Visit /settings/application-infos (have search params)
    act(() => testHistory.push('/protected?hello=world'));

    await waitFor(() => expect(testLocation.pathname).toBe('/auth/login'));
    // Should preserve search params
    expect(new URLSearchParams(testLocation.search).get('redirectTo')).toBe(
      '/protected?hello=world'
    );

    expect(screen.getByText('Please login')).toBeInTheDocument();
  });
});
