import { render } from '@tests/utils';

import { useRBAC } from '../../../../../hooks/useRBAC';
import { ListPage } from '../ListPage';

jest.mock('../../../../../hooks/useRBAC', () => ({
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: {
      canCreate: true,
      canDelete: true,
      canRead: true,
      canUpdate: true,
    },
  })),
}));

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

describe('<ListPage />', () => {
  it('should show a list of roles', async () => {
    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });

  it('should render roles without crashing when canCreate is false and canUpdate is true', async () => {
    // @ts-ignore
    useRBAC.mockReturnValueOnce({
      isLoading: false,
      allowedActions: {
        canCreate: false,
        canDelete: false,
        canRead: true,
        canUpdate: true,
      },
      permissions: [],
    });

    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });
});
