import * as React from 'react';

import { http, HttpResponse } from 'msw';
import { describe, it, expect, afterAll, vi } from 'vitest';

import { server } from '../../../../tests/server';
import { render, waitFor } from '../../../../tests/utils';
import { AdvancedSettingsPage } from '../index';

vi.mock('@strapi/strapi/admin', async (importOriginal) => ({
  ...(await importOriginal()),
  useRBAC: vi.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true },
  })),
}));

describe('ADMIN | Pages | Settings | Advanced Settings', () => {
  afterAll(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByRole, queryByText } = render(<AdvancedSettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Advanced Settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(
      getByRole('combobox', { name: 'Default role for authenticated users' })
    ).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'One account per email address' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Enable sign-ups' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Enable email confirmation' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Reset password page' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Redirection url' })).toBeInTheDocument();
  });
});

it('clears a saved confirmation redirect when email confirmation is disabled', async () => {
  const save = vi.fn();
  server.use(
    http.put('*/users-permissions/advanced', async ({ request }) => {
      save(await request.json());

      return HttpResponse.json({ ok: true });
    })
  );
  const { getByRole, findByRole, user, findByText } = render(<AdvancedSettingsPage />);
  const confirmation = await findByRole('checkbox', { name: 'Enable email confirmation' });
  await user.click(confirmation);
  await user.type(
    getByRole('textbox', { name: 'Redirection url' }),
    'https://example.com/confirmed'
  );
  await user.click(confirmation);
  await user.click(getByRole('checkbox', { name: 'Enable sign-ups' }));
  await user.click(getByRole('button', { name: 'Save' }));
  expect(await findByText('Saved')).toBeInTheDocument();
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      allow_register: true,
      email_confirmation: false,
      email_confirmation_redirection: '',
    })
  );
});
