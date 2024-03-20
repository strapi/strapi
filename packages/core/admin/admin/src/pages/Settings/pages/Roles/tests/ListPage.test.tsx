import { render } from '@tests/utils';

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

describe('<ListPage />', () => {
  it('should show a list of roles', async () => {
    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });
});
