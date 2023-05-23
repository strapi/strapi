import React from 'react';

import { Router, Route, Switch } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { render, screen, waitFor } from '@testing-library/react';
import { auth } from '@strapi/helper-plugin';
import PrivateRoute from '..';

const ProtectedPage = () => {
  return <div>You are authenticated</div>;
};

const LoginPage = () => {
  return <div>Please login</div>;
};

const history = createMemoryHistory();

describe('PrivateRoute', () => {
  const renderApp = () =>
    render(
      <Router history={history}>
        <Switch>
          <Route path="/auth/login" component={LoginPage} />
          <PrivateRoute path="/" component={ProtectedPage} />
        </Switch>
      </Router>
    );

  afterEach(() => {
    auth.clearToken();
  });

  it('Authenticated users should be able to access protected routes', async () => {
    // Login
    auth.setToken('access-token');
    renderApp();
    // Visit a protected route
    history.push('/protected');
    // Should see the protected route
    expect(await screen.findByText('You are authenticated'));
  });

  it('Unauthenticated users should not be able to access protected routes and get redirected', async () => {
    renderApp();

    // Visit `/`
    history.push('/');
    // Should redirected to `/auth/login`
    await waitFor(() => {
      expect(history.location.pathname).toBe('/auth/login');
      // No `redirectTo` in the search params
      expect(history.location.search).toBe('');
      expect(screen.getByText('Please login')).toBeInTheDocument();
    });

    // Visit /settings/application-infos (no search params)
    history.push('/settings/application-infos');
    // Should redirected to `/auth/login` and preserve the `/settings/application-infos` path
    await waitFor(() => {
      expect(history.location.pathname).toBe('/auth/login');
      // Should preserve url in the params
      expect(history.location.search).toBe(
        `?redirectTo=${encodeURIComponent('/settings/application-infos')}`
      );
      expect(screen.getByText('Please login')).toBeInTheDocument();
    });

    // Visit /settings/application-infos (have search params)
    history.push('/settings/application-infos?hello=world');
    await waitFor(() => {
      expect(history.location.pathname).toBe('/auth/login');
      // Should preserve search params
      expect(history.location.search).toBe(
        `?redirectTo=${encodeURIComponent('/settings/application-infos?hello=world')}`
      );
      expect(screen.getByText('Please login')).toBeInTheDocument();
    });
  });
});
