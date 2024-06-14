import { errors } from '@strapi/utils';
import { fireEvent } from '@testing-library/react';
import { screen, render, server } from '@tests/utils';
import { rest } from 'msw';

import { CreateLocale } from '../CreateLocale';

describe('Create Locale', () => {
  it('should render correctly', async () => {
    const { user } = render(<CreateLocale />);

    expect(screen.getByRole('button', { name: 'Add new locale' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add new locale' }));

    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('tablist', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Basic settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Advanced settings' })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Basic settings' })).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Locales' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Locale display name' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Advanced settings' }));

    expect(screen.getByRole('checkbox', { name: 'Set as default locale' })).toBeInTheDocument();
  });

  it('should not show the modal when the disabled prop is true', async () => {
    render(<CreateLocale disabled={true} />);

    expect(screen.getByRole('button', { name: 'Add new locale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add new locale' })).toBeDisabled();

    expect(screen.queryByRole('heading', { name: 'Configuration' })).not.toBeInTheDocument();
  });

  it('should allow the user to create a new locale', async () => {
    const { user } = render(<CreateLocale />);
    await user.click(screen.getByRole('button', { name: 'Add new locale' }));

    await user.click(screen.getByRole('combobox', { name: 'Locales' }));

    await screen.findByRole('option', { name: 'Afrikaans (af)' });
    await user.click(screen.getByRole('option', { name: 'Afrikaans (af)' }));

    await user.type(screen.getByRole('textbox', { name: 'Locale display name' }), 'Afrikaans');

    await user.click(screen.getByRole('tab', { name: 'Advanced settings' }));

    await user.click(screen.getByRole('checkbox', { name: 'Set as default locale' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/Success/)).toBeInTheDocument();
  });

  it('should show an error if the creation fails', async () => {
    server.use(
      rest.post('/i18n/locales', (_, res, ctx) =>
        res(
          ctx.status(500),
          ctx.json({
            error: new errors.ApplicationError('Could not create locale'),
          })
        )
      )
    );

    const { user } = render(<CreateLocale />);
    await user.click(screen.getByRole('button', { name: 'Add new locale' }));

    await user.click(screen.getByRole('combobox', { name: 'Locales' }));
    await user.click(screen.getByRole('option', { name: 'Afrikaans (af)' }));

    await user.type(screen.getByRole('textbox', { name: 'Locale display name' }), 'Afrikaans');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Could not create locale')).toBeInTheDocument();
  });

  describe('validation error', () => {
    it("should handle it's own validation", async () => {
      const { user } = render(<CreateLocale />);
      await user.click(screen.getByRole('button', { name: 'Add new locale' }));

      await user.type(screen.getByRole('textbox', { name: 'Locale display name' }), 'a');

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Please select a locale')).toBeInTheDocument();

      await user.click(screen.getByRole('combobox', { name: 'Locales' }));
      await user.click(screen.getByRole('option', { name: 'Afrikaans (af)' }));
      await user.clear(screen.getByRole('textbox', { name: 'Locale display name' }));

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Please give the locale a display name')).toBeInTheDocument();

      await user.type(
        screen.getByRole('textbox', { name: 'Locale display name' }),
        Array(256).fill('a').join('')
      );

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(
        await screen.findByText('The locale display name can only be less than 50 characters.')
      ).toBeInTheDocument();
    });

    it('should handle validation errors from the server', async () => {
      server.use(
        rest.post('/i18n/locales', (_, res, ctx) =>
          res(
            ctx.status(400),
            ctx.json({
              error: new errors.ValidationError('Valiation error', {
                errors: [
                  {
                    path: ['code'],
                    message: 'This code is already in use',
                  },
                  {
                    path: ['name'],
                    message: 'This name has unsupported characters',
                  },
                ],
              }),
            })
          )
        )
      );

      const { user } = render(<CreateLocale />);
      await user.click(await screen.findByRole('button', { name: 'Add new locale' }));
      await user.click(await screen.findByRole('combobox', { name: 'Locales' }));
      await user.click(await screen.findByRole('option', { name: 'Afrikaans (af)' }));

      fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

      expect(await screen.findByText('This code is already in use')).toBeInTheDocument();
      expect(await screen.findByText('This name has unsupported characters')).toBeInTheDocument();
    });
  });
});
