import { server } from '@tests/server';
import { render, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { AuthPage } from '../AuthPage';

const LocationDisplay = () => {
  const { pathname, search } = useLocation();

  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

const renderAuthPage = (initialEntry: string) =>
  render(
    <Routes>
      <Route path="/auth/:authType" element={<AuthPage />} />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { initialEntries: [initialEntry] }
  );

describe('AuthPage', () => {
  beforeEach(() => {
    // An admin already exists, otherwise every auth route funnels to `register-admin`
    server.use(http.get('/admin/init', () => HttpResponse.json({ data: { hasAdmin: true } })));
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe('when the user is already authenticated', () => {
    beforeEach(() => {
      window.localStorage.setItem('jwtToken', JSON.stringify('access-token'));
    });

    // The token lands in the store before the login form gets to navigate, so this
    // redirect is what decides where the user ends up.
    // https://github.com/strapi/strapi/issues/19557
    it('redirects to the `redirectTo` param instead of the home page', async () => {
      renderAuthPage('/auth/login?redirectTo=%2Fsettings');

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/settings');
      });
    });

    it('preserves the search params of the redirect target', async () => {
      renderAuthPage('/auth/login?redirectTo=%2Fprotected%3Fhello%3Dworld');

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/protected?hello=world');
      });
    });

    it('redirects to the home page when there is no `redirectTo` param', async () => {
      renderAuthPage('/auth/login');

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/');
      });
    });
  });

  it('redirects to the home page for an unknown auth type', async () => {
    renderAuthPage('/auth/not-an-auth-type');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });
  });
});
