import { DesignSystemProvider } from '@strapi/design-system';
import { Form } from '@strapi/strapi/admin';
import { render as renderRTL } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ColorPickerInput } from '../ColorPickerInput';

const render = () => ({
  ...renderRTL(<ColorPickerInput name="color" label={'color-picker'} type="string" />, {
    wrapper: ({ children }) => {
      const locale = 'en';
      return (
        <IntlProvider locale={locale} messages={{}} textComponent="span">
          <DesignSystemProvider locale={locale}>
            <Form onSubmit={jest.fn()} method="POST">
              {children}
            </Form>
          </DesignSystemProvider>
        </IntlProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('<ColorPickerInput />', () => {
  it('renders and matches the snapshot', () => {
    const { container } = render();

    expect(container).toMatchSnapshot();
  });

  it('toggles the popover', async () => {
    const { user, getByRole } = render();
    await user.click(getByRole('button', { name: 'Color picker toggle' }));

    expect(getByRole('dialog')).toBeVisible();
    expect(getByRole('slider', { name: 'Color' })).toBeVisible();
    expect(getByRole('slider', { name: 'Hue' })).toBeVisible();
    expect(getByRole('textbox', { name: 'Color picker input' })).toBeVisible();
    expect(getByRole('textbox', { name: 'Color picker input' })).toHaveValue('#000000');
  });

  it('can change color via text input', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: 'Color picker toggle' }));

    const textInput = getByRole('textbox', { name: 'Color picker input' });
    const testColor = '#ff3c0c';

    await user.clear(textInput);
    await user.type(textInput, testColor);

    expect(textInput).toHaveValue(testColor);
  });
});
