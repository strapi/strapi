import { render, screen } from '@tests/utils';

import { ModalForm } from '../NewUserForm';

jest.mock('../../../../../../hooks/useAdminRoles', () => ({
  useAdminRoles: jest.fn(() => ({
    roles: [],
    isLoading: false,
  })),
}));

jest.mock('../../../../../../services/users', () => ({
  useCreateUserMutation: jest.fn(() => [jest.fn()]),
}));

describe('<ModalForm />', () => {
  it('keeps the invite form open when clicking outside the modal', async () => {
    const onToggle = jest.fn();
    const { user } = render(<ModalForm onToggle={onToggle} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(document.body);

    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
