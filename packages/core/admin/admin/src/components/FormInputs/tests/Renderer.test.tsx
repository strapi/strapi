import { render, screen } from '@tests/utils';

import { Form } from '../../Form';
import { InputRenderer } from '../Renderer';

describe('Renderer', () => {
  [
    {
      label: 'biginteger',
      name: 'biginteger',
      role: 'textbox',
      type: 'biginteger' as const,
    },
    {
      label: 'timestamp',
      name: 'timestamp',
      role: 'textbox',
      type: 'timestamp' as const,
    },
    {
      label: 'string',
      name: 'string',
      role: 'textbox',
      type: 'string' as const,
    },
    {
      label: 'boolean',
      name: 'boolean',
      role: 'checkbox',
      type: 'boolean' as const,
    },
    {
      label: 'checkbox',
      name: 'checkbox',
      role: 'checkbox',
      type: 'checkbox' as const,
    },
    {
      label: 'datetime',
      name: 'datetime',
      role: 'group',
      type: 'datetime' as const,
    },
    {
      label: 'date',
      name: 'date',
      role: 'combobox',
      type: 'date' as const,
    },
    {
      label: 'decimal',
      name: 'decimal',
      role: 'textbox',
      type: 'decimal' as const,
    },
    {
      label: 'float',
      name: 'float',
      role: 'textbox',
      type: 'float' as const,
    },
    {
      label: 'integer',
      name: 'integer',
      role: 'textbox',
      type: 'integer' as const,
    },
    // TODO: fix in the DS because none of the tests can pass here.
    // {
    //   label: 'json',
    //   name: 'json',
    //   role: 'textbox',
    //   type: 'json' as const,
    // },
    {
      label: 'email',
      name: 'email',
      role: 'textbox',
      type: 'email' as const,
    },
    {
      label: 'enumeration',
      name: 'enumeration',
      options: [],
      role: 'combobox',
      type: 'enumeration' as const,
    },
    {
      label: 'password',
      name: 'password',
      role: 'textbox',
      type: 'password' as const,
    },
    {
      label: 'text',
      name: 'text',
      role: 'textbox',
      type: 'text' as const,
    },
    {
      label: 'time',
      name: 'time',
      role: 'combobox',
      type: 'time' as const,
    },
  ].forEach(({ role, ...field }) => {
    it(`should render the ${field.type} input`, () => {
      render(<InputRenderer {...field} />, {
        renderOptions: {
          wrapper: ({ children }) => <Form method="PUT">{children}</Form>,
        },
      });

      /**
       * Password fields don't have a role.
       */
      if (field.type === 'password') {
        expect(screen.getByLabelText(field.label)).toBeInTheDocument();
      } else {
        expect(screen.getByRole(role)).toBe(screen.getByLabelText(field.label));
      }
    });

    it(`should render a disabled ${field.type} input when the field's disabled prop is true`, () => {
      render(<InputRenderer disabled {...field} />, {
        renderOptions: {
          wrapper: ({ children }) => <Form method="PUT">{children}</Form>,
        },
      });

      /**
       * Password fields don't have a role.
       */
      if (field.type === 'password') {
        expect(screen.getByLabelText(field.label)).toBeDisabled();
      } else if (field.type === 'datetime') {
        /**
         * datetime fields are a composition of date and time fields.
         */
        screen.getAllByRole('combobox').forEach((element) => expect(element).toBeDisabled());
      } else if (field.type === 'enumeration') {
        /**
         * TODO: fix the disabled issue in the DS.
         */
        expect(screen.getByRole(role)).toHaveAttribute('aria-disabled', 'true');
      } else {
        expect(screen.getByRole(role)).toBeDisabled();
      }
    });

    it.todo(`should render a hint for the ${field.type} input when the field has a hint`);

    it.todo(`should render an error for the ${field.type} input when the form has errors`);
  });
});
