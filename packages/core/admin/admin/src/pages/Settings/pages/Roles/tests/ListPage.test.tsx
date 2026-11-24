import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { useAdminRoles } from '../../../../../hooks/useAdminRoles';
import { ListPage } from '../ListPage';

jest.mock('../../../../../hooks/useAdminRoles', () => ({
  useAdminRoles: jest.fn(() => ({
    roles: [
      {
        code: 'strapi-super-admin',
        created_at: '2021-08-24T14:37:20.384Z',
        description: 'Super Admins can access and manage all features and settings.',
        id: 1,
        name: 'Super Admin',
        updatedAt: '2021-08-24T14:37:20.384Z',
        usersCount: 1,
      },
    ],
    isLoading: false,
  })),
}));

const defaultUseAdminRoles = jest.mocked(useAdminRoles).getMockImplementation()!;

describe('<ListPage />', () => {
  afterEach(() => {
    jest.mocked(useAdminRoles).mockImplementation(defaultUseAdminRoles);
  });

  it('should show a list of roles', async () => {
    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });

  it('offers to view a role a plugin made read-only, and not to edit or delete it', async () => {
    jest.mocked(useAdminRoles).mockReturnValue({
      roles: [
        { id: 2, code: 'editor', name: 'Editor', description: '', usersCount: 0 },
        {
          id: 3,
          code: 'shared',
          name: 'Shared reviewer',
          description: '',
          usersCount: 0,
          readOnly: true,
          readOnlyReason: 'Shared roles are edited in the Control center.',
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminRoles>);

    render(<ListPage />);

    const editorRow = await screen.findByRole('row', { name: /Editor/ });
    const sharedRow = screen.getByRole('row', { name: /Shared reviewer/ });

    expect(within(editorRow).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(editorRow).getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    expect(within(sharedRow).getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(within(sharedRow).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(sharedRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(within(sharedRow).getByRole('button', { name: 'Duplicate' })).toBeInTheDocument();
  });
});
