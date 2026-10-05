import * as React from 'react';

import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { server } from '../../../../tests/server';
import { render, waitFor } from '../../../../tests/utils';
import { ProvidersPage } from '../Providers';

const permissions = vi.hoisted(() => ({ canUpdate: false }));

vi.mock('@strapi/strapi/admin', async (importOriginal) => ({
  ...(await importOriginal()),
  useRBAC: vi.fn(() => ({
    isLoading: false,
    allowedActions: permissions,
  })),
}));

describe('Admin | containers | ProvidersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show a list of providers', async () => {
    const { getByText, getByTestId } = render(<ProvidersPage />);

    await waitFor(() => {
      expect(getByText('email')).toBeInTheDocument();
    });
    expect(getByTestId('enable-email')).toHaveTextContent('Enabled');
    expect(getByTestId('enable-discord')).toHaveTextContent('Disabled');
  });
});

it('saves an email provider change without removing other providers', async () => {
  permissions.canUpdate = true;
  const save = vi.fn();
  server.use(
    http.put('*/users-permissions/providers', async ({ request }) => {
      save(await request.json());

      return HttpResponse.json({ ok: true });
    })
  );
  const { findByText, findByRole, getByRole, user } = render(<ProvidersPage />);
  await user.click(await findByText('email'));
  await user.click(await findByRole('checkbox', { name: 'enabled' }));
  await user.click(getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      providers: expect.objectContaining({
        email: expect.objectContaining({ enabled: false }),
        discord: expect.objectContaining({ enabled: false, callback: '/auth/discord/callback' }),
      }),
    })
  );
  await findByRole('heading', { name: 'Providers' });
});

it.each([
  ['discord', ''],
  ['auth0', 'tenant.auth0.com'],
])('shows the server-provided OAuth callback for %s', async (provider, subdomain) => {
  permissions.canUpdate = true;
  const redirectUri = `https://cms.example.org/platform/content-api/connect/${provider}/callback`;
  server.use(
    http.get('*/users-permissions/providers', () =>
      HttpResponse.json({
        [provider]: {
          enabled: false,
          key: '',
          secret: '',
          callback: '',
          subdomain,
          redirectUri,
        },
      })
    )
  );
  const { findByText, findByRole, user } = render(<ProvidersPage />);
  await user.click(await findByText(provider));
  const redirect = await findByRole('textbox', {
    name: `The redirect URL to add in your ${provider} application configurations`,
  });
  expect(redirect).toHaveValue(redirectUri);
  expect(redirect).toBeDisabled();
});
