import { render, screen } from '@tests/utils';
import { IntlProvider } from 'react-intl';

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

/**
 * Regression test for https://github.com/strapi/strapi/issues/27283
 *
 * The empty option that lets you unset the field is selected while the field has
 * no value, so the select renders its label in the trigger. Forwarding a
 * `placeholder` down to the select made it render that too, so both strings
 * ended up in the trigger ("Choose hereChoose here" on Settings > Single Sign-On).
 */
describe('EnumerationInput placeholder', () => {
  const enumerationField = {
    label: 'Default role',
    name: 'defaultRole',
    type: 'enumeration' as const,
    required: false,
    options: [{ value: 'editor', label: 'Editor' }],
  };

  const renderField = (props: Partial<typeof enumerationField> & { placeholder?: string } = {}) =>
    render(<InputRenderer {...enumerationField} {...props} />, {
      renderOptions: {
        wrapper: ({ children }) => <Form method="POST">{children}</Form>,
      },
    });

  it('renders the placeholder exactly once when the field has no value', () => {
    renderField({ placeholder: 'Choose here' });

    const trigger = screen.getByRole('combobox', { name: 'Default role' });

    expect(trigger.textContent?.match(/Choose here/g)).toHaveLength(1);
  });

  it('uses the placeholder as the label of the empty option', async () => {
    const { user } = renderField({ placeholder: 'Pick a role' });

    await user.click(screen.getByRole('combobox', { name: 'Default role' }));

    expect(await screen.findByRole('option', { name: 'Pick a role' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Choose here' })).not.toBeInTheDocument();
  });

  it('falls back to the default placeholder when none is provided', () => {
    renderField();

    const trigger = screen.getByRole('combobox', { name: 'Default role' });

    expect(trigger.textContent?.match(/Choose here/g)).toHaveLength(1);
  });
});
