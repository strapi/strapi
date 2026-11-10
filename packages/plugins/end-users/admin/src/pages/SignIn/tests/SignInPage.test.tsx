import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { fireEvent } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { PERMISSIONS } from '../../../constants';
import { SignInPage } from '../SignInPage';

import { refuseOn, serveSettings, SETTINGS } from './fixtures';

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

    // Off and out of reach, whatever is stored: it can't work without its package
    expect(screen.getByRole('checkbox', { name: 'Passkeys' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Passkeys' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Username' })).toBeEnabled();
    expect(screen.getAllByText(/^Not installed\./)).toHaveLength(4);
    expect(screen.queryByText(/`/)).not.toBeInTheDocument();
  });

  it('words every toggle as Enabled and Disabled, and marks none as required', async () => {
    serveSettings();
    renderPage();

    await screen.findByRole('heading', { name: 'Sign-in' });

    expect(screen.getAllByText('Enabled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Disabled').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^(true|false)$/i)).not.toBeInTheDocument();
    // A toggle can't be empty: only the numbers carry the asterisk
    expect(screen.getAllByText('*')).toHaveLength(4);
  });

  it('shows a stored method that is not installed as off, and keeps the stored value', async () => {
    const saved = serveSettings({
      ...SETTINGS,
      data: { ...SETTINGS.data, methods: { ...SETTINGS.data.methods, passkey: true } },
    });
    const { user } = renderPage();

    expect(await screen.findByRole('checkbox', { name: 'Passkeys' })).not.toBeChecked();

    const min = screen.getByRole('textbox', { name: /Minimum length/ });

    await user.clear(min);
    await user.type(min, '10');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    // The save leaves a method that is not installed out, so the server keeps what it has
    expect(saved[0]).toMatchObject({ methods: { emailPassword: true, username: false } });
    expect(saved[0]).not.toHaveProperty('methods.passkey');
  });

  it('shows server validation errors on their fields', async () => {
    serveSettings();
    server.use(refuseOn(['passwords', 'minLength'], 'minLength cannot exceed maxLength'));
    const { user } = renderPage();

    const min = await screen.findByRole('textbox', { name: /Minimum length/ });

    await user.clear(min);
    await user.type(min, '500');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // The message is under the field, which is then marked invalid
    expect(await screen.findByText('minLength cannot exceed maxLength')).toHaveAttribute(
      'data-strapi-field-error'
    );
    expect(min).toBeInvalid();
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

    expect(await screen.findByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('Session cookie cache')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('Session lasts')).toBeInTheDocument();
  });
});
