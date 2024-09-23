import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';

import { AssigneeFilter, AssigneeFilterProps } from '../AssigneeFilter';

/**
 * Filters are not currently supported
 */
describe.skip('AssigneeFilter', () => {
  const render = (props?: Partial<AssigneeFilterProps>) =>
    renderRTL(
      <AssigneeFilter name="assignee" type="enumeration" aria-label="Assignee" {...props} />,
      {
        renderOptions: {
          wrapper({ children }) {
            return <Form method="PUT">{children}</Form>;
          },
        },
      }
    );

  it('should render all the options fetched from the API', async () => {
    const { user } = render();

    await user.click(screen.getByRole('combobox'));

    await screen.findByRole('option', { name: 'John Doe' });

    expect(screen.getByRole('option', { name: 'Kai Doe' })).toBeInTheDocument();
  });

  it('should call the onChange function with the selected value', async () => {
    const { user } = render();

    await user.click(screen.getByRole('combobox'));

    await screen.findByRole('option', { name: 'John Doe' });

    await user.click(screen.getByRole('option', { name: 'John Doe' }));

    expect(screen.getByRole('combobox')).toHaveValue('John Doe');
  });
});
