import { render } from '@tests/utils';

import { useAdminRoles } from '../../../../../hooks/useAdminRoles';
import { useRBAC } from '../../../../../hooks/useRBAC';
import { ListPage } from '../ListPage';

jest.mock('../../../../../hooks/useRBAC');
jest.mock('../../../../../hooks/useAdminRoles');

describe('<ListPage />', () => {
  it('should show a list of roles', () => {
    // @ts-expect-error - mock
    useAdminRoles.mockImplementationOnce(() => ({
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
    }));

    // @ts-expect-error - mock
    useRBAC.mockImplementationOnce(() => ({
      isLoading: false,
      allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
    }));
    const { getByText } = render(<ListPage />);

    expect(getByText('Super Admin')).toBeInTheDocument();
  });
});
