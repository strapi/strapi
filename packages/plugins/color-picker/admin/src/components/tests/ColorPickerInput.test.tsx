import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ColorPickerInput } from '../ColorPickerInput';

const render = () => ({
  ...renderRTL(
    <ColorPickerInput
      name="color"
      value=""
      onChange={jest.fn()}
      attribute={{
        customField: 'plugin::color-picker.color',
        pluginOptions: { i18n: { localized: true } },
        type: 'string',
      }}
      intlLabel={{ id: 'color-picker', defaultMessage: 'color-picker' }}
    />,
    {
      wrapper: ({ children }) => {
        const locale = 'en';
        return (
          <IntlProvider locale={locale} messages={{}} textComponent="span">
            <DesignSystemProvider locale={locale}>{children}</DesignSystemProvider>
          </IntlProvider>
        );
      },
    }
  ),
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
  });
});
