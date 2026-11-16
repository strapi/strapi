import * as React from 'react';

import { within } from '@testing-library/react';
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
  expect(within(await findByRole('dialog')).queryAllByRole('textbox')).toEqual([]);
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
  const dialog = within(await findByRole('dialog'));
  expect(dialog.getAllByRole('textbox').map((input) => input.getAttribute('name'))).toEqual([
    'key',
    'secret',
    ...(provider === 'auth0' ? ['jwksurl', 'subdomain'] : []),
    'callback',
    'redirectUri',
  ]);
  expect(dialog.getByLabelText('Client ID')).toBeEnabled();
  expect(dialog.getByLabelText('Client Secret')).toBeEnabled();
  expect(dialog.getByLabelText('The redirect URL to your front-end app')).toHaveAttribute(
    'placeholder',
    'https://www.client-app.com'
  );
  const redirect = await findByRole('textbox', {
    name: `The redirect URL to add in your ${provider} application configurations`,
  });
  expect(redirect).toHaveValue(redirectUri);
  expect(redirect).toBeDisabled();
});

it('lists and edits a provider under its store key when its settings carry a name', async () => {
  permissions.canUpdate = true;
  server.use(
    http.get('*/users-permissions/providers', () =>
      HttpResponse.json({
        github: {
          name: 'stored-name',
          enabled: true,
          key: 'github-client-id',
          secret: 'github-secret',
          callback: '',
          redirectUri: 'http://localhost:1337/api/connect/github/callback',
        },
      })
    )
  );
  const { findByText, findByRole, getByTestId, queryByText, user } = render(<ProvidersPage />);
  await user.click(await findByText('github'));
  expect(queryByText('stored-name')).not.toBeInTheDocument();
  expect(getByTestId('enable-github')).toHaveTextContent('Enabled');
  const dialog = within(await findByRole('dialog'));
  expect(dialog.getByRole('checkbox', { name: 'enabled' })).toBeChecked();
  expect(dialog.getByLabelText('Client ID')).toHaveValue('github-client-id');
  expect(dialog.getByLabelText('Client Secret')).toHaveValue('github-secret');
});
