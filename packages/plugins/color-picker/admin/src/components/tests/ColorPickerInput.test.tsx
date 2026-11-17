import { DesignSystemProvider } from '@strapi/design-system';
import { Form } from '@strapi/strapi/admin';
import { render as renderRTL } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ColorPickerInput } from '../ColorPickerInput';

/**
 * Mock the cropper import to avoid having an error
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});

const render = (initialValues = {}) => ({
  ...renderRTL(<ColorPickerInput name="color" label={'color-picker'} type="string" />, {
    wrapper: ({ children }) => {
      const locale = 'en';
      return (
        <IntlProvider locale={locale} messages={{}} textComponent="span">
          <DesignSystemProvider locale={locale}>
            <Form onSubmit={jest.fn()} method="POST" initialValues={initialValues}>
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
  it('renders with the correct elements', () => {
    const { getByRole, getByText } = render();

    // Check for the label
    expect(getByText('color-picker')).toBeInTheDocument();

    // Check for the color picker button
    const colorPickerButton = getByRole('button', { name: 'Color picker toggle' });
    expect(colorPickerButton).toBeInTheDocument();

    // The button should be present (we can't check the exact style as it might be implemented differently)
    expect(colorPickerButton).toHaveAttribute('aria-label', 'Color picker toggle');
  });

  it('toggles the popover', async () => {
    const { user, getByRole } = render();
    await user.click(getByRole('button', { name: 'Color picker toggle' }));

    expect(getByRole('dialog')).toBeVisible();
    expect(getByRole('slider', { name: 'Color' })).toBeVisible();
    expect(getByRole('slider', { name: 'Hue' })).toBeVisible();
    expect(getByRole('textbox', { name: 'Color picker input' })).toBeVisible();
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

  it('shows the typed color in the preview', async () => {
    const { user, getByRole, getByTestId } = render();

    await user.click(getByRole('button', { name: 'Color picker toggle' }));

    const textInput = getByRole('textbox', { name: 'Color picker input' });

    await user.clear(textInput);
    await user.type(textInput, '#ff3c0c');

    const preview = getByTestId('color-preview');
    expect(preview).toHaveStyle({ backgroundColor: '#ff3c0c' });
  });

  it.each(['', '#', '#a', '#abc', '#aBcDeF'])(
    'accepts the partial or complete HEX value %j',
    async (value) => {
      const { user, getByRole } = render({ color: '#ff3c0c' });

      await user.click(getByRole('button', { name: 'Color picker toggle' }));
      const textInput = getByRole('textbox', { name: 'Color picker input' });

      await user.clear(textInput);
      if (value) {
        await user.type(textInput, value);
      }

      expect(textInput).toHaveValue(value);
    }
  );

  it.each(['abc', 'ABCDEF'])('adds the hash to the HEX value %j', async (value) => {
    const { user, getByRole, getByTestId } = render();

    await user.click(getByRole('button', { name: 'Color picker toggle' }));
    const textInput = getByRole('textbox', { name: 'Color picker input' });

    await user.type(textInput, value);

    expect(textInput).toHaveValue(`#${value}`);
    expect(getByTestId('color-preview')).toHaveStyle({ backgroundColor: `#${value}` });
  });

  it.each(['red', 'rgb(255,0,0)', '#ff000080'])(
    'can remove a stored legacy value %j with Backspace',
    async (value) => {
      const { user, getByRole } = render({ color: value });

      await user.click(getByRole('button', { name: 'Color picker toggle' }));
      const textInput = getByRole('textbox', { name: 'Color picker input' });
      await user.click(textInput);
      await user.keyboard('{End}{Backspace}');

      expect(textInput).toHaveValue(value.slice(0, -1));

      await user.keyboard('{Backspace}'.repeat(value.length - 1));
      expect(textInput).toHaveValue('');
    }
  );

  it('ignores non-HEX characters while typing', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: 'Color picker toggle' }));
    const textInput = getByRole('textbox', { name: 'Color picker input' });

    await user.type(textInput, 'HUHIUHIHIHI');
    expect(textInput).toHaveValue('');

    await user.type(textInput, '#ff(');
    expect(textInput).toHaveValue('#ff');
  });

  it('ignores an invalid pasted value', async () => {
    const { user, getByRole, getByTestId } = render({ color: '#ff3c0c' });

    await user.click(getByRole('button', { name: 'Color picker toggle' }));
    const textInput = getByRole('textbox', { name: 'Color picker input' });

    await user.click(textInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.paste('#ff(');

    expect(textInput).toHaveValue('#ff3c0c');
    expect(getByTestId('color-preview')).toHaveStyle({ backgroundColor: '#ff3c0c' });
  });

  it('limits the input to an optional hash and six HEX characters', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: 'Color picker toggle' }));
    const textInput = getByRole('textbox', { name: 'Color picker input' });

    expect(textInput).toHaveAttribute('maxlength', '7');
    await user.type(textInput, '#1234567');
    expect(textInput).toHaveValue('#123456');

    await user.clear(textInput);
    await user.type(textInput, '1234567');
    expect(textInput).toHaveValue('#123456');
  });

  it('does not write a stored invalid value into the shared stylesheet', () => {
    render({ color: '#ff(' });

    // eslint-disable-next-line testing-library/no-node-access
    const styles = Array.from(document.querySelectorAll('style'), (style) => style.textContent);
    expect(styles.join('')).not.toContain('#ff(');
  });
});
