import * as React from 'react';

import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

import { server } from '../../../../tests/server';
import { render, screen, waitFor } from '../../../../tests/utils';
import { EmailTemplatesPage } from '../EmailTemplates';

vi.mock('@strapi/strapi/admin', async (importOriginal) => ({
  ...(await importOriginal()),
  useRBAC: vi.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true },
  })),
}));

describe('ADMIN | Pages | Settings | Email Templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it('renders and matches the snapshot', async () => {
    render(<EmailTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Reset password')).toBeInTheDocument();
    });
  });
});

it('saves an edited template while retaining the other email template', async () => {
  const save = vi.fn();
  server.use(
    http.put('*/users-permissions/email-templates', async ({ request }) => {
      save(await request.json());

      return HttpResponse.json({ ok: true });
    })
  );
  const { findByText, getByRole, findByRole, user } = render(<EmailTemplatesPage />);
  await user.click(await findByText('Reset password'));
  const subject = await findByRole('textbox', { name: 'Subject' });
  await user.clear(subject);
  await user.type(subject, 'New reset subject');
  await user.click(getByRole('button', { name: 'Finish' }));
  expect(await findByText('Saved')).toBeInTheDocument();
  expect(save).toHaveBeenCalledWith({
    'email-templates': expect.objectContaining({
      reset_password: expect.objectContaining({
        options: expect.objectContaining({ object: 'New reset subject' }),
      }),
      email_confirmation: expect.objectContaining({ display: 'Email.template.email_confirmation' }),
    }),
  });
});
