import { errors } from '@strapi/utils';
import { fireEvent } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { EditLocale } from '../EditLocale';

import type { Locale } from '../../../../shared/contracts/locales';

const LOCALE: Locale = {
  id: 1,
  code: 'en',
  isDefault: false,
  name: 'English',
  createdAt: '',
  updatedAt: '',
};

describe('Edit Locale', () => {
  it('should render correctly', async () => {
    const { user } = render(<EditLocale {...LOCALE} />);

    expect(screen.getByRole('button', { name: 'Edit English locale' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit English locale' }));

    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('tablist', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Basic settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Advanced settings' })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Basic settings' })).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Locales' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Locales' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('textbox', { name: 'Locale display name' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Advanced settings' }));

    expect(screen.getByRole('checkbox', { name: 'Set as default locale' })).toBeInTheDocument();
  });

  it('should allow the user to edit an existing locale', async () => {
    const { user } = render(<EditLocale {...LOCALE} />);
    await user.click(screen.getByRole('button', { name: 'Edit English locale' }));

    await user.click(screen.getByRole('combobox', { name: 'Locales' }));

    await user.clear(screen.getByRole('textbox', { name: 'Locale display name' }));
    await user.type(screen.getByRole('textbox', { name: 'Locale display name' }), 'Afrikaans');

    await user.click(screen.getByRole('tab', { name: 'Advanced settings' }));

    await user.click(screen.getByRole('checkbox', { name: 'Set as default locale' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/Success/)).toBeInTheDocument();
  });

  it('should show an error if the update fails', async () => {
    server.use(
      rest.put('/i18n/locales/:id', (_, res, ctx) =>
        res(
          ctx.status(500),
          ctx.json({
            error: new errors.ApplicationError('Could not update locale'),
          })
        )
      )
    );

    const { user } = render(<EditLocale {...LOCALE} />);
    await user.click(await screen.findByRole('button', { name: 'Edit English locale' }));

    await user.type(
      await screen.findByRole('textbox', { name: 'Locale display name' }),
      'Afrikaans'
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Could not update locale')).toBeInTheDocument();
  });

  describe('validation error', () => {
    it("should handle it's own validation", async () => {
      const { user } = render(<EditLocale {...LOCALE} />);
      await user.click(screen.getByRole('button', { name: 'Edit English locale' }));
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
        rest.put('/i18n/locales/:id', (_, res, ctx) =>
          res(
            ctx.status(400),
            ctx.json({
              error: new errors.ValidationError('Valiation error', {
                errors: [
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

      const { user } = render(<EditLocale {...LOCALE} />);
      await user.click(screen.getByRole('button', { name: 'Edit English locale' }));
      await user.type(screen.getByRole('textbox', { name: 'Locale display name' }), 'Afrikaans');

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('This name has unsupported characters')).toBeInTheDocument();
    });
  });
});
