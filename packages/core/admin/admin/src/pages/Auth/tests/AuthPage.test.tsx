import { render, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { initOverrides, resetInitOverrides } from '../../../../tests/server';
import { AuthPage } from '../AuthPage';

const renderAt = (pathname: string) =>
  render(
    <Routes>
      <Route path="/auth/:authType" element={<AuthPage />} />
      <Route path="/" element={<div>home</div>} />
    </Routes>,
    { initialEntries: [pathname] }
  );

describe('AuthPage routing', () => {
  afterEach(() => {
    resetInitOverrides();
  });

  describe('registerEnabled: true (default)', () => {
    test('redirects /auth/login to /auth/register-admin when no admin exists', async () => {
      initOverrides.hasAdmin = false;
      initOverrides.registerEnabled = true;

      renderAt('/auth/login');

      // The register-admin form renders "Welcome to Strapi!" as its heading,
      // which is distinct from the login form's "Welcome!" heading.
      expect(
        await screen.findByRole('heading', { name: /welcome to strapi/i })
      ).toBeInTheDocument();
      // Login would have shown "Log in to your Strapi account"; register-admin does not.
      expect(screen.queryByText(/log in to your strapi account/i)).not.toBeInTheDocument();
    });
  });

  describe('registerEnabled: false', () => {
    test('does NOT redirect /auth/login to /auth/register-admin when no admin exists', async () => {
      initOverrides.hasAdmin = false;
      initOverrides.registerEnabled = false;

      renderAt('/auth/login');

      // Login form stays put.
      expect(await screen.findByText(/log in to your strapi account/i)).toBeInTheDocument();
    });

    test('redirects direct visit to /auth/register-admin to /auth/login (fresh install)', async () => {
      initOverrides.hasAdmin = false;
      initOverrides.registerEnabled = false;

      renderAt('/auth/register-admin');

      expect(await screen.findByText(/log in to your strapi account/i)).toBeInTheDocument();
    });

    test('redirects direct visit to /auth/register-admin to /auth/login (existing admin)', async () => {
      initOverrides.hasAdmin = true;
      initOverrides.registerEnabled = false;

      renderAt('/auth/register-admin');

      expect(await screen.findByText(/log in to your strapi account/i)).toBeInTheDocument();
    });
  });
});
