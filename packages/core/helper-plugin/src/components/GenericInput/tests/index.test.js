import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GenericInput from '../index';

function ComponentFixture(props) {
  return (
    <IntlProvider locale="en" messages={{}}>
      <ThemeProvider theme={lightTheme}>
        <GenericInput {...props} />
      </ThemeProvider>
    </IntlProvider>
  );
}

function setupNumber(props) {
  const NUMBER_FIXTURE_PROPS = {
    type: 'number',
    name: 'number',
    intlLabel: {
      id: 'label.test',
      defaultMessage: 'Default label',
    },
    placeholder: {
      id: 'placeholder.test',
      defaultMessage: 'Default placeholder',
    },
    hint: 'Hint message',
    value: null,
    required: true,
    onChange: jest.fn,
    ...props,
  };

  const rendered = render(<ComponentFixture {...NUMBER_FIXTURE_PROPS} />);
  const input = rendered.container.querySelector('input');

  return {
    ...rendered,
    input,
  };
}

function setupDatetimePicker(props) {
  const DATETIMEPICKER_FIXTURE_PROPS = {
    type: 'datetime',
    name: 'datetime-picker',
    intlLabel: {
      id: 'label.test',
      defaultMessage: 'datetime picker',
    },
    value: null,
    onChange: jest.fn(),
    onClear: jest.fn(),
    ...props,
  };

  const rendered = render(<ComponentFixture {...DATETIMEPICKER_FIXTURE_PROPS} />);

  return {
    ...rendered,
  };
}
/**
 * We extend the timeout of these tests because the DS
 * DateTimePicker has a slow rendering issue at the moment.
 * It passes locally, but fails in the CI.
 */
jest.setTimeout(50000);

describe('GenericInput', () => {
  describe('number', () => {
    test('renders and matches the snapshot', () => {
      const { container } = setupNumber();
      expect(container).toMatchSnapshot();
    });

    test('renders an error message', () => {
      const { getByText } = setupNumber({ error: 'Error message' });
      expect(getByText('Error message')).toBeInTheDocument();
    });

    test('renders a number (int) value', () => {
      const { container } = setupNumber({ value: 1 });
      expect(container.querySelector('[type="text"]').value).toBe('1');
    });

    test('renders a number (float) value', () => {
      const { container } = setupNumber({ value: 1.3333 });
      expect(container.querySelector('input').value).toBe('1.3333');
    });

    test('does not call onChange callback on first render', () => {
      const spy = jest.fn();
      setupNumber({ value: null, onChange: spy });
      expect(spy).not.toHaveBeenCalled();
    });

    test('does not call onChange callback if the value does not change', () => {
      const spy = jest.fn();
      const { input } = setupNumber({ value: 23, onChange: spy });

      fireEvent.change(input, { target: { value: 23 } });

      expect(spy).not.toHaveBeenCalledWith();
    });

    test('does call onChange callback with number (int) value', () => {
      const spy = jest.fn();
      const { input } = setupNumber({ value: null, onChange: spy });

      fireEvent.change(input, { target: { value: '23' } });

      expect(spy).toHaveBeenCalledWith({ target: { name: 'number', type: 'number', value: 23 } });
    });

    test('does call onChange callback with number (float) value', () => {
      const spy = jest.fn();
      const { input } = setupNumber({ value: null, onChange: spy });

      fireEvent.change(input, { target: { value: '1.3333' } });

      expect(spy).toHaveBeenCalledWith({
        target: { name: 'number', type: 'number', value: 1.3333 },
      });
    });

    test('does call onChange callback with number (0) value', () => {
      const spy = jest.fn();
      const { input } = setupNumber({ value: null, onChange: spy });

      fireEvent.change(input, { target: { value: '0' } });

      expect(spy).toHaveBeenCalledWith({
        target: { name: 'number', type: 'number', value: 0 },
      });
    });
  });
  describe('json', () => {
    test('renders and matches the snapshot', () => {
      const { container } = render(
        <ComponentFixture
          type="json"
          name="json"
          intlLabel={{
            id: 'label.test',
            defaultMessage: 'Default label',
          }}
          value={null}
          onChange={jest.fn}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('datetime', () => {
    test('renders the datetime picker with the correct value for date and time', async () => {
      const user = userEvent.setup();
      const { getByRole } = setupDatetimePicker();

      await user.click(getByRole('textbox', { name: 'datetime picker' }));
      await act(async () => {
        await user.click(getByRole('button', { name: /15/ }));
      });

      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      expect(getByRole('textbox', { name: 'datetime picker' })).toHaveValue(`${month}/15/${year}`);
      expect(getByRole('combobox')).toHaveTextContent('00:00');
    });

    test('simulate clicking on the Clear button in the date and check if the date and time are empty', async () => {
      const user = userEvent.setup();
      const { getByRole } = setupDatetimePicker();
      const btnDate = getByRole('textbox', { name: /datetime picker/i });
      await user.click(btnDate);
      await act(async () => {
        await user.click(getByRole('button', { name: /15/ }));
      });
      await user.click(getByRole('button', { name: /clear date/i }));

      expect(getByRole('textbox', { name: 'datetime picker' })).toHaveValue('');
      expect(getByRole('combobox')).not.toHaveValue();
    });
  });
});
