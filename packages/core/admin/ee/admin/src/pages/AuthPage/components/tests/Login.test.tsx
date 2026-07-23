import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { LoginEE } from '../Login';

const PROVIDERS = [
  { uid: 'github', displayName: 'GitHub' },
  { uid: 'google', displayName: 'Google' },
];

const FIELD_LABELS = ['Email', 'Password'];

describe('LoginEE', () => {
  const originalIsEnabled = window.strapi.features.isEnabled;

  beforeEach(() => {
    window.strapi.features.isEnabled = () => true;
    server.use(http.get('/admin/providers', () => HttpResponse.json(PROVIDERS)));
  });

  afterEach(() => {
    window.strapi.features.isEnabled = originalIsEnabled;
    delete (window.strapi.flags as Record<string, unknown>).disableLocalLoginForSSO;
  });

  it('hides the local login form when disableLocalLoginForSSO is enabled', async () => {
    (window.strapi.flags as Record<string, unknown>).disableLocalLoginForSSO = true;

    render(<LoginEE />);

    // SSO providers are still rendered
    expect(await screen.findByRole('link', { name: 'GitHub' })).toBeInTheDocument();

    // ...but the local login form, login button and forgot-password link are gone
    FIELD_LABELS.forEach((label) => {
      expect(screen.queryByLabelText(new RegExp(`^${label}`, 'i'))).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Forgot your password?' })).not.toBeInTheDocument();
  });

  it('falls back to the plain login form when SSO is disabled', async () => {
    window.strapi.features.isEnabled = () => false;

    render(<LoginEE />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument();
  });
});
