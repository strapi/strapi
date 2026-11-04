import { render, screen } from '@tests/utils';

import { Form } from '../../Form';
import { InputRenderer } from '../Renderer';

describe('BooleanInput (via InputRenderer)', () => {
  const booleanField = {
    label: 'Published',
    name: 'published',
    type: 'boolean' as const,
    required: false,
  };

  it('shows Clear when the value is set and the field is editable', () => {
    render(<InputRenderer {...booleanField} />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="PUT" initialValues={{ published: true }}>
            {children}
          </Form>
        ),
      },
    });

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('hides Clear when the field is disabled (e.g. published review view)', () => {
    render(<InputRenderer {...booleanField} disabled />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="PUT" initialValues={{ published: true }}>
            {children}
          </Form>
        ),
      },
    });

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it.each([
    ['null', { published: null }],
    ['undefined', {}],
  ])('renders neither option as selected when the value is %s', (_, initialValues) => {
    render(<InputRenderer {...booleanField} />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="PUT" initialValues={initialValues}>
            {children}
          </Form>
        ),
      },
    });

    expect(getComputedStyle(screen.getByText('False')).color).toBe(
      getComputedStyle(screen.getByText('True')).color
    );
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('highlights False when the value is false', () => {
    render(<InputRenderer {...booleanField} />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="PUT" initialValues={{ published: false }}>
            {children}
          </Form>
        ),
      },
    });

    expect(getComputedStyle(screen.getByText('False')).color).not.toBe(
      getComputedStyle(screen.getByText('True')).color
    );
  });
});
