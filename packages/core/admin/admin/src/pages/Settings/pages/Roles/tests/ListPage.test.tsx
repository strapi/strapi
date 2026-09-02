import { render } from '@tests/utils';

import { useRBAC } from '../../../../../hooks/useRBAC';
import { ListPage } from '../ListPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../../../hooks/useRBAC');

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

const setupPermissions = (canCreate: boolean, canUpdate: boolean) => {
  // @ts-expect-error – mocking
  useRBAC.mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canRead: true, canCreate, canUpdate, canDelete: false },
  }));
};

describe('<ListPage />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of roles', async () => {
    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });

  it('should go to the edit page when a row is clicked without the create permission', async () => {
    setupPermissions(false, true);

    const { findByText, user } = render(<ListPage />);

    await user.click(await findByText('Super Admin'));

    expect(mockNavigate).toHaveBeenCalledWith('1');
  });

  it('should not go to the edit page when a row is clicked without the update permission', async () => {
    setupPermissions(false, false);

    const { findByText, user } = render(<ListPage />);

    await user.click(await findByText('Super Admin'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
