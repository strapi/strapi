import * as React from 'react';

import { http, HttpResponse } from 'msw';
import { describe, it, expect, afterAll, vi } from 'vitest';

import { server } from '../../../../tests/server';
import { render, waitFor } from '../../../../tests/utils';
import { AdvancedSettingsPage } from '../AdvancedSettings';

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

it('reports a rejected settings update and retains the edited form', async () => {
  server.use(
    http.put('*/users-permissions/advanced', () =>
      HttpResponse.json(
        {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Settings could not be saved',
            details: {},
          },
        },
        { status: 400 }
      )
    )
  );
  const { findByRole, getByRole, findByText, user } = render(<AdvancedSettingsPage />);
  await user.click(await findByRole('checkbox', { name: 'Enable sign-ups' }));
  await user.click(getByRole('button', { name: 'Save' }));
  expect(await findByText('Settings could not be saved')).toBeInTheDocument();
  expect(getByRole('checkbox', { name: 'Enable sign-ups' })).toBeChecked();
});

it('shows the error page and a danger notification when the settings cannot be loaded', async () => {
  server.use(
    http.get('*/users-permissions/advanced', () =>
      HttpResponse.json(
        {
          error: {
            status: 500,
            name: 'InternalServerError',
            message: 'Internal Server Error',
            details: {},
          },
        },
        { status: 500 }
      )
    )
  );
  const { findByText, queryByRole } = render(<AdvancedSettingsPage />);
  expect(await findByText('Whoops! Something went wrong. Please, try again.')).toBeInTheDocument();
  expect((await findByText('An error occurred')).closest('[role="alert"]')).toBeInTheDocument();
  expect(queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
});
