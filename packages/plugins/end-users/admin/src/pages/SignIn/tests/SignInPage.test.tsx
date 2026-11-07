import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { fireEvent } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { PERMISSIONS } from '../../../constants';
import { SignInPage } from '../SignInPage';

import { refuseOn, serveSettings } from './fixtures';

const renderPage = () =>
  render(<SignInPage />, { initialEntries: ['/settings/end-users/sign-in'] });

describe('SignInPage', () => {
  it('saves the settings it shows', async () => {
    const saved = serveSettings();
    const { user } = renderPage();

    const min = await screen.findByRole('textbox', { name: /Minimum length/ });

    await user.clear(min);
    await user.type(min, '12');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(saved).toEqual([
      {
        // A method that is not installed is left out of the save
        methods: { emailPassword: true, username: false },
        signUp: {
          enabled: true,
          defaultRoles: ['p1'],
          requireEmailVerification: false,
          registrationFields: ['displayName'],
        },
        passwords: { minLength: 12, maxLength: 128, requireMixedClasses: false },
        lockout: { enabled: true, maxAttempts: 5, durationMinutes: 15 },
      },
    ]);
  });

  it('opens without roles.read, showing the stored default roles by id', async () => {
    serveSettings();
    server.use(
      http.get('/end-users/roles', () =>
        HttpResponse.json(
          { error: { status: 403, name: 'ForbiddenError', message: 'Forbidden' } },
          { status: 403 }
        )
      )
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Sign-in' })).toBeInTheDocument();
    expect(screen.getByText('p1')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your permissions do not let you list roles, so the chosen ones are shown by id.'
      )
    ).toBeInTheDocument();
  });

  it('disables a method that is not installed, with the hint', async () => {
    serveSettings();
    renderPage();

    await screen.findByRole('heading', { name: 'Sign-in' });

    expect(screen.getByRole('checkbox', { name: 'Passkeys' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Username' })).toBeEnabled();
    expect(screen.getAllByText('Add it in `config/plugins.ts`')).toHaveLength(4);
  });

  it('shows server validation errors on their fields', async () => {
    serveSettings();
    server.use(refuseOn(['passwords', 'minLength'], 'minLength cannot exceed maxLength'));
    const { user } = renderPage();

    const min = await screen.findByRole('textbox', { name: /Minimum length/ });

    await user.clear(min);
    await user.type(min, '500');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('minLength cannot exceed maxLength')).toBeInTheDocument();
  });

  it('is read-only without settings.update', async () => {
    serveSettings();
    renderAdmin(<SignInPage />, {
      initialEntries: ['/settings/end-users/sign-in'],
      providerOptions: { permissions: PERMISSIONS.settings.read },
    });

    expect(await screen.findByRole('textbox', { name: /Minimum length/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Username' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the sessions read-only', async () => {
    serveSettings();
    renderPage();

    expect(await screen.findByText('7d')).toBeInTheDocument();
    expect(screen.getByText('Session lasts')).toBeInTheDocument();
  });
});
