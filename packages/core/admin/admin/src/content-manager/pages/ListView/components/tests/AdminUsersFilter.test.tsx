import { render, screen } from '@tests/utils';

import { AdminUsersFilter } from '../AdminUsersFilter';

describe('AdminUsersFilter', () => {
  it('should render all the options fetched from the API', async () => {
    const mockOnChange = jest.fn();
    const { user } = render(<AdminUsersFilter onChange={mockOnChange} />);

    await user.click(screen.getByRole('combobox'));

    await screen.findByText('John Doe');

    expect(screen.getByText('Kai Doe')).toBeInTheDocument();
  });

  it('should call the onChange function with the selected value', async () => {
    const mockOnChange = jest.fn();
    const { user } = render(<AdminUsersFilter onChange={mockOnChange} />);

    await user.click(screen.getByRole('combobox'));

    await screen.findByText('John Doe');

    await user.click(screen.getByText('John Doe'));

    expect(mockOnChange).toHaveBeenCalledWith('1');
  });
});
