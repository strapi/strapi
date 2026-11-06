import { fireEvent } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';

import endUsers from '../../../index';
import { refuseOn, serveSettings, SETTINGS } from '../../SignIn/tests/fixtures';
import { AdvancedPage } from '../AdvancedPage';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

const renderPage = () =>
  render(<AdvancedPage />, { initialEntries: ['/settings/end-users/advanced'] });

describe('AdvancedPage', () => {
  it('saves the settings it shows', async () => {
    const saved = serveSettings();
    const { user } = renderPage();

    const reset = await screen.findByRole('textbox', { name: 'Password reset' });

    await user.type(reset, '/reset');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(saved).toEqual([
      { redirects: { emailVerified: '/welcome', passwordReset: '/reset', error: null } },
    ]);
  });

  it('shows server validation errors on their fields', async () => {
    serveSettings();
    server.use(refuseOn(['redirects', 'emailVerified'], 'Not a trusted origin'));
    const { user } = renderPage();

    const verified = await screen.findByRole('textbox', { name: 'Email verified' });

    await user.type(verified, 'x');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Not a trusted origin')).toBeInTheDocument();
  });

  it('shows the config/plugins.ts settings read-only, and never a secret value', async () => {
    serveSettings();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Set in config/plugins.ts' })
    ).toBeInTheDocument();

    // Only the redirects are inputs; everything from the config is text
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.getByText('Secret')).toBeInTheDocument();
    expect(screen.getByText('Set')).toBeInTheDocument();
    expect(screen.getByText(/shorter than 32 characters/)).toBeInTheDocument();
    expect(screen.getByText('https://app.example.com')).toBeInTheDocument();
    expect(screen.getByText('end-users.welcome')).toBeInTheDocument();
    expect(screen.getByText('database')).toBeInTheDocument();
  });

  it('says when the secret is not set', async () => {
    serveSettings({
      ...SETTINGS,
      meta: {
        ...SETTINGS.meta,
        config: { ...SETTINGS.meta.config, secret: { set: false, tooShort: false } },
      },
    });
    renderPage();

    expect(await screen.findByText('Not set')).toBeInTheDocument();
    expect(screen.queryByText(/shorter than 32 characters/)).not.toBeInTheDocument();
  });

  it('links to the email templates filtered to end-users', () => {
    const addSettingsLink = jest.fn();

    endUsers.register({ addSettingsLink, registerPlugin: jest.fn() } as unknown as StrapiApp);

    const links = addSettingsLink.mock.calls[0][1] as Array<{ id: string; to: string }>;

    expect(links.find((link) => link.id === 'email-templates')?.to).toBe(
      'email/templates?prefix=end-users.'
    );
  });
});
