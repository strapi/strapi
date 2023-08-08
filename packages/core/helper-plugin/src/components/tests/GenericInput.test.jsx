import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { GenericInput } from '../GenericInput';

function setup(props) {
  return {
    ...render(
      <GenericInput
        intlLabel={{
          id: 'label.test',
          defaultMessage: 'Default label',
        }}
        onChange={jest.fn}
        value={null}
        {...props}
      />,
      {
        wrapper: ({ children }) => (
          <IntlProvider locale="en" messages={{}}>
            <DesignSystemProvider locale="en-GB">{children}</DesignSystemProvider>
          </IntlProvider>
        ),
      }
    ),
    user: userEvent.setup(),
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
    const setupNumber = (props) => {
      return setup({
        type: 'number',
        name: 'number',
        placeholder: {
          id: 'placeholder.test',
          defaultMessage: 'Default placeholder',
        },
        hint: 'Hint message',
        required: true,
        ...props,
      });
    };

    test('renders and matches the snapshot', () => {
      const { container } = setupNumber();
      expect(container).toMatchSnapshot();
    });

    test('renders an error message', () => {
      const { getByText } = setupNumber({ error: 'Error message' });
      expect(getByText('Error message')).toBeInTheDocument();
    });

    test('renders a number (int) value', () => {
      const { getByRole } = setupNumber({ value: 1 });
      expect(getByRole('textbox')).toHaveValue('1');
    });

    test('renders a number (float) value', () => {
      const { getByRole } = setupNumber({ value: 1.3333 });
      expect(getByRole('textbox')).toHaveValue('1.3333');
    });

    test('does not call onChange callback on first render', () => {
      const spy = jest.fn();
      setupNumber({ value: null, onChange: spy });
      expect(spy).not.toHaveBeenCalled();
    });

    test('does not call onChange callback if the value does not change', () => {
      const spy = jest.fn();
      const { getByRole } = setupNumber({ value: 23, onChange: spy });

      fireEvent.change(getByRole('textbox'), { target: { value: 23 } });

      expect(spy).not.toHaveBeenCalledWith();
    });

    test('does call onChange callback with number (int) value', () => {
      const spy = jest.fn();
      const { getByRole } = setupNumber({ value: null, onChange: spy });

      fireEvent.change(getByRole('textbox'), { target: { value: '23' } });

      expect(spy).toHaveBeenCalledWith({ target: { name: 'number', type: 'number', value: 23 } });
    });

    test('does call onChange callback with number (float) value', () => {
      const spy = jest.fn();
      const { getByRole } = setupNumber({ value: null, onChange: spy });

      fireEvent.change(getByRole('textbox'), { target: { value: '1.3333' } });

      expect(spy).toHaveBeenCalledWith({
        target: { name: 'number', type: 'number', value: 1.3333 },
      });
    });

    test('does call onChange callback with number (0) value', () => {
      const spy = jest.fn();
      const { getByRole } = setupNumber({ value: null, onChange: spy });

      fireEvent.change(getByRole('textbox'), { target: { value: '0' } });

      expect(spy).toHaveBeenCalledWith({
        target: { name: 'number', type: 'number', value: 0 },
      });
    });
  });

  describe('json', () => {
    test('renders and matches the snapshot', () => {
      const { container } = setup({
        type: 'json',
        name: 'json',
        value: null,
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('date', () => {
    const setupDateField = (props) => {
      return setup({
        type: 'date',
        name: 'date',
        intlLabel: {
          id: 'label.test',
          defaultMessage: 'date',
        },
        onClear: jest.fn(),
        ...props,
      });
    };

    it('should allow the user to clear the field', async () => {
      const onChange = jest.fn();

      const { getByRole, user } = setupDateField({
        value: new Date(),
        onChange,
      });

      await user.click(getByRole('button', { name: 'Clear' }));

      expect(getByRole('combobox', { name: 'date' })).toHaveValue('');
      expect(onChange).toHaveBeenCalledWith({
        target: { name: 'date', type: 'date', value: null },
      });
    });
  });

  describe('datetime', () => {
    const setupDatetimePicker = (props) => {
      return setup({
        type: 'datetime',
        name: 'datetime-picker',
        intlLabel: {
          id: 'label.test',
          defaultMessage: 'datetime picker',
        },
        onClear: jest.fn(),
        ...props,
      });
    };

    test('renders the datetime picker with the correct value for date and time', async () => {
      const { getByRole, user } = setupDatetimePicker();

      await user.click(getByRole('combobox', { name: 'Choose date' }));
      await user.click(getByRole('gridcell', { name: /15/ }));

      const today = new Date().setDate(15);
      const formattedDate = new Intl.DateTimeFormat('en-GB').format(today);
      expect(getByRole('combobox', { name: 'Choose date' })).toHaveValue(formattedDate);
      expect(getByRole('combobox', { name: 'Choose time' })).toHaveValue('00:00');
    });

    test('simulate clicking on the Clear button in the date and check if the date and time are empty', async () => {
      const user = userEvent.setup();
      const { getByRole } = setupDatetimePicker();

      await user.click(getByRole('combobox', { name: 'Choose date' }));
      await user.click(getByRole('gridcell', { name: /15/ }));
      await user.click(getByRole('button', { name: 'Clear date' }));

      expect(getByRole('combobox', { name: 'Choose date' })).toHaveValue('');
      expect(getByRole('combobox', { name: 'Choose time' })).toHaveValue('');
    });
  });

  describe('textarea', () => {
    test('calls onChange callback with textarea value', async () => {
      const onChange = jest.fn();

      const { getByRole, user } = setup({
        type: 'textarea',
        name: 'textarea',
        onChange,
      });

      const textarea = getByRole('textbox');

      await user.type(textarea, 'test');

      expect(onChange).toHaveBeenNthCalledWith(1, {
        target: { name: 'textarea', type: 'textarea', value: 't' },
      });
      expect(onChange).toHaveBeenNthCalledWith(2, {
        target: { name: 'textarea', type: 'textarea', value: 'e' },
      });
      expect(onChange).toHaveBeenNthCalledWith(3, {
        target: { name: 'textarea', type: 'textarea', value: 's' },
      });
      expect(onChange).toHaveBeenNthCalledWith(4, {
        target: { name: 'textarea', type: 'textarea', value: 't' },
      });
    });
  });
});
