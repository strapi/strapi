import { render, screen } from '@tests/utils';

import { Form, useField } from '../../Form';
import { InputRenderer } from '../Renderer';

const Value = () => <output>{JSON.stringify(useField('spaces').value)}</output>;

describe('MultiSelectInput (via InputRenderer)', () => {
  it('keeps the initial values and adds a chosen value', async () => {
    const { user } = render(
      <InputRenderer
        label="Spaces"
        name="spaces"
        type="multi-select"
        options={[
          { label: 'Space A', value: 'a' },
          { label: 'Space B', value: 'b' },
        ]}
      />,
      {
        renderOptions: {
          wrapper: ({ children }) => (
            <Form method="PUT" initialValues={{ spaces: ['a'] }}>
              {children}
              <Value />
            </Form>
          ),
        },
      }
    );

    await user.click(screen.getByRole('combobox', { name: 'Spaces' }));
    await user.click(await screen.findByRole('option', { name: 'Space B' }));

    expect(screen.getByText('["a","b"]', { selector: 'output' })).toBeInTheDocument();
  });
});
