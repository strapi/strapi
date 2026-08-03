import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
// eslint-disable-next-line testing-library/no-manual-cleanup -- vitest unitPreset sets globals:false so RTL auto-cleanup does not register
import { cleanup, render as renderRTL } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FieldState = {
  value: string;
  error?: string;
  onChange: (event: { target: { name: string; value: string } }) => void;
  onBlur: () => void;
};

const { MockForm, useMockField, resetFieldState } = vi.hoisted(() => {
  let fieldState: FieldState = {
    value: '',
    onChange: () => undefined,
    onBlur: () => undefined,
  };

  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const resetFieldState = () => {
    fieldState = {
      value: '',
      onChange: (event) => {
        fieldState = { ...fieldState, value: event.target.value };
        notify();
      },
      onBlur: () => undefined,
    };
    notify();
  };

  resetFieldState();

  const MockForm = ({
    children,
    onSubmit,
  }: {
    children: React.ReactNode;
    onSubmit?: (event: React.FormEvent) => void;
  }) => React.createElement('form', { onSubmit }, children);

  const useMockField = () => {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const listener = () => setTick((tick) => tick + 1);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }, []);
    return fieldState;
  };

  return { MockForm, useMockField, resetFieldState };
});

vi.mock('@strapi/strapi/admin', () => ({
  Form: MockForm,
  useField: useMockField,
}));

import { ColorPickerInput } from '../ColorPickerInput';

const render = () => ({
  ...renderRTL(<ColorPickerInput name="color" label={'color-picker'} type="string" />, {
    wrapper: ({ children }) => {
      const locale = 'en';
      return (
        <IntlProvider locale={locale} messages={{}} textComponent="span">
          <DesignSystemProvider locale={locale}>
            <MockForm onSubmit={vi.fn()}>{children}</MockForm>
          </DesignSystemProvider>
        </IntlProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('<ColorPickerInput />', () => {
  beforeEach(() => {
    resetFieldState();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with the correct elements', () => {
    const { getByRole, getByText } = render();

    expect(getByText('color-picker')).toBeInTheDocument();

    const colorPickerButton = getByRole('button', { name: 'Color picker toggle' });
    expect(colorPickerButton).toBeInTheDocument();
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
});
