import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import ColorPickerInput from '../ColorPicker/ColorPickerInput';

const mockAttribute = {
  customField: 'plugin::color-picker.color',
  pluginOptions: { i18n: { localized: true } },
  type: 'string',
};

const App = (
  <IntlProvider locale="en" messages={{}} textComponent="span">
    <ThemeProvider theme={lightTheme}>
      <ColorPickerInput
        name="color"
        value=""
        onChange={jest.fn()}
        attribute={mockAttribute}
        intlLabel={{ id: 'color-picker', defaultMessage: 'color-picker' }}
      />
    </ThemeProvider>
  </IntlProvider>
);

describe('<ColorPickerInput />', () => {
  /**
   * We do this because –
   * https://github.com/facebook/jest/issues/12670
   */
  beforeAll(() => {
    jest.setTimeout(30000);
  });

  /**
   * Reset timeout to what is expected
   */
  afterAll(() => {
    jest.setTimeout(5000);
  });

  it('renders and matches the snapshot', () => {
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  it('toggles the popover', () => {
    render(App);
    const colorPickerToggle = screen.getByRole('button', { name: 'Color picker toggle' });
    fireEvent.click(colorPickerToggle);

    const popover = screen.getByRole('dialog');
    const saturation = screen.getByRole('slider', { name: 'Color' });
    const hue = screen.getByRole('slider', { name: 'Hue' });
    const input = screen.getByRole('textbox', { name: 'Color picker input' });
    expect(popover).toBeVisible();
    expect(saturation).toBeVisible();
    expect(hue).toBeVisible();
    expect(input).toBeVisible();
  });
});
