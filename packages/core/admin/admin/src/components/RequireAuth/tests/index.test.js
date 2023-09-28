import React from 'react';

import { auth } from '@strapi/helper-plugin';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import RequireAuth from '..';

const ProtectedPage = () => {
  return <div>You are authenticated</div>;
};

const LoginPage = () => {
  return <div>Please login</div>;
};

describe('RequireAuth', () => {
  const renderApp = () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <RequireAuth>
            <ProtectedPage />
          </RequireAuth>
        ),
      },
      {
        path: '/auth/login',
        element: <LoginPage />,
      },
      {
        path: '/protected',
        element: (
          <RequireAuth>
            <ProtectedPage />
          </RequireAuth>
        ),
      },
    ]);
    render(<RouterProvider router={router} />);

    return { router };
  };
  afterEach(() => {
    auth.clearToken();
  });

  it('Authenticated users should be able to access protected routes', async () => {
    // Login
    auth.setToken('access-token');
    const { router } = renderApp();
    // Visit a protected route
    await act(() => router.navigate('/'));
    // Should see the protected route
    expect(await screen.findByText('You are authenticated'));
  });

  it('Unauthenticated users should not be able to access protected routes and get redirected', async () => {
    const { router } = renderApp();

    // Visit `/`
    await act(() => router.navigate('/'));
    // Should redirected to `/auth/login`
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth/login');
      // No `redirectTo` in the search params
      expect(router.state.location.search).toBe('');
      expect(screen.getByText('Please login')).toBeInTheDocument();
    });

    // Visit `/protected` (no search params)
    await act(() => router.navigate('/protected'));
    // Should redirected to `/auth/login`
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth/login');
      // Should preserve url in the params
      expect(router.state.location.search).toBe(`?redirectTo=${encodeURIComponent('/protected')}`);
      expect(screen.getByText('Please login')).toBeInTheDocument();
    });

    // Visit /protected (have search params)
    await act(() => router.navigate('/protected?hello=world'));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth/login');
      // Should preserve search params
      expect(router.state.location.search).toBe(
        `?redirectTo=${encodeURIComponent('/protected?hello=world')}`
      );
      expect(screen.getByText('Please login')).toBeInTheDocument();
    });
  });
});
