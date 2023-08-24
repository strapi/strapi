import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { GenericInput } from '../GenericInput';

function renderField(props, { initialEntries } = {}) {
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
            <DesignSystemProvider locale="en-GB">
              <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
            </DesignSystemProvider>
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
    const renderNumber = (props) => {
      return renderField({
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

    test('renders an error message', () => {
      const { getByText } = renderNumber({ error: 'Error message' });
      expect(getByText('Error message')).toBeInTheDocument();
    });

    test('renders a number (int) value', () => {
      const { getByRole } = renderNumber({ value: 1 });
      expect(getByRole('textbox')).toHaveValue('1');
    });

    test('renders a number (float) value', () => {
      const { getByRole } = renderNumber({ value: 1.3333 });
      expect(getByRole('textbox')).toHaveValue('1.3333');
    });

    test('does not call onChange callback on first render', () => {
      const spy = jest.fn();
      renderNumber({ value: null, onChange: spy });
      expect(spy).not.toHaveBeenCalled();
    });

    test('does not call onChange callback if the value does not change', async () => {
      const spy = jest.fn();
      const { getByRole, user } = renderNumber({ value: 23, onChange: spy });

      await user.type(getByRole('textbox'), '23');

      expect(spy).not.toHaveBeenCalledWith();
    });

    test('does call onChange callback with number (int) value', async () => {
      const spy = jest.fn();
      const { user, getByRole } = renderNumber({ value: null, onChange: spy });

      await user.type(getByRole('textbox'), '23');

      expect(spy).toHaveBeenCalledWith({ target: { name: 'number', type: 'number', value: 23 } });
    });

    test('does call onChange callback with number (float) value', async () => {
      const spy = jest.fn();
      const { getByRole, user } = renderNumber({ value: null, onChange: spy });

      await user.type(getByRole('textbox'), '1.3333');

      expect(spy).toHaveBeenCalledWith({
        target: { name: 'number', type: 'number', value: 1.3333 },
      });
    });

    test('does call onChange callback with number (0) value', async () => {
      const spy = jest.fn();
      const { getByRole, user } = renderNumber({ value: null, onChange: spy });

      await user.type(getByRole('textbox'), '0');

      expect(spy).toHaveBeenCalledWith({
        target: { name: 'number', type: 'number', value: 0 },
      });
    });
  });

  describe('json', () => {
    test('renders and matches the snapshot', () => {
      const { container } = renderField({
        type: 'json',
        name: 'json',
        value: null,
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('date', () => {
    const renderDate = (props) => {
      return renderField({
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

      const { getByRole, user } = renderDate({
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
    const renderDateTime = (props) => {
      return renderField({
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
      const { getByRole, user } = renderDateTime();

      await user.click(getByRole('combobox', { name: 'Choose date' }));
      await user.click(getByRole('gridcell', { name: /15/ }));

      const today = new Date().setDate(15);
      const formattedDate = new Intl.DateTimeFormat('en-GB').format(today);
      expect(getByRole('combobox', { name: 'Choose date' })).toHaveValue(formattedDate);
      expect(getByRole('combobox', { name: 'Choose time' })).toHaveValue('00:00');
    });

    test('simulate clicking on the Clear button in the date and check if the date and time are empty', async () => {
      const { getByRole, user } = renderDateTime();

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

      const { getByRole, user } = renderField({
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

  describe('auto-focussing', () => {
    test.each([
      'bool',
      'checkbox',
      'date',
      'datetime',
      'email',
      'number',
      'password',
      'select',
      'text',
      'textarea',
      'time',
    ])('auto-focuses on %s', (type) => {
      const { getByLabelText } = renderField(
        { type, name: 'test' },
        { initialEntries: [{ pathname: '/', search: `field=test` }] }
      );

      /**
       * datetime renders two fields, and it should focus the date field.
       */

      if (type === 'datetime') {
        expect(getByLabelText('Choose date')).toHaveFocus();
      } else {
        expect(getByLabelText('Default label')).toHaveFocus();
      }
    });
  });
});
