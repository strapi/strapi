import { render } from '@tests/utils';

import { AssigneeFilter } from '../AssigneeFilter';

describe('Content-Manager | List-view | AssigneeFilter', () => {
  it('should render all the options fetched from the API', async () => {
    const mockOnChange = jest.fn();
    const { getByText, user, getByRole, findByText } = render(
      <AssigneeFilter onChange={mockOnChange} />
    );

    await user.click(getByRole('combobox'));

    await findByText('John Doe');

    expect(getByText('Kai Doe')).toBeInTheDocument();
  });

  it('should call the onChange function with the selected value', async () => {
    const mockOnChange = jest.fn();
    const { getByText, user, getByRole, findByText } = render(
      <AssigneeFilter onChange={mockOnChange} />
    );

    await user.click(getByRole('combobox'));

    await findByText('John Doe');

    const option = getByText('John Doe');

    await user.click(option);

    expect(mockOnChange).toHaveBeenCalledWith('1');
  });
});
