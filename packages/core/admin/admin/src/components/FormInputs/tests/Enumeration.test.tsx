import { IntlProvider } from 'react-intl';

import { render, screen } from '@tests/utils';

import { Form } from '../../Form';
import { InputRenderer } from '../Renderer';

/**
 * Regression test for https://github.com/strapi/strapi/issues/26683
 *
 * In v4 the admin passed enumeration option values through `react-intl`, so an
 * enum value could act as a translation key. The v5 form-framework rewrite
 * dropped this and rendered raw enum values. The option label is now resolved
 * with `formatMessage({ id: value, defaultMessage: value })`, which restores
 * translated labels while falling back to the raw value when no message is
 * registered (so untranslated enums render exactly as before).
 */
describe('EnumerationInput (via InputRenderer)', () => {
  const enumerationField = {
    label: 'Period',
    name: 'period',
    type: 'enumeration' as const,
    required: false,
    options: [{ value: 'morning' }, { value: 'evening' }],
  };

  it('translates option labels using the enum value as the message id', async () => {
    const { user } = render(<InputRenderer {...enumerationField} />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <IntlProvider
            locale="en"
            defaultLocale="en"
            textComponent="span"
            messages={{ morning: 'Le matin', evening: 'Le soir' }}
          >
            <Form method="POST">{children}</Form>
          </IntlProvider>
        ),
      },
    });

    await user.click(screen.getByRole('combobox', { name: 'Period' }));

    expect(await screen.findByRole('option', { name: 'Le matin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Le soir' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'morning' })).not.toBeInTheDocument();
  });

  it('falls back to the raw value when no translation is registered', async () => {
    const { user } = render(<InputRenderer {...enumerationField} />, {
      renderOptions: {
        wrapper: ({ children }) => <Form method="POST">{children}</Form>,
      },
    });

    await user.click(screen.getByRole('combobox', { name: 'Period' }));

    expect(await screen.findByRole('option', { name: 'morning' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'evening' })).toBeInTheDocument();
  });
});
