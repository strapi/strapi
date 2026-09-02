import { render } from '@tests/utils';

import { ListPage } from '../ListPage';

const mockNavigate = jest.fn();

let mockAllowedActions = {
  canCreate: true,
  canDelete: true,
  canRead: true,
  canUpdate: true,
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../../../hooks/useRBAC', () => ({
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: mockAllowedActions,
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
  beforeEach(() => {
    jest.clearAllMocks();

    mockAllowedActions = {
      canCreate: true,
      canDelete: true,
      canRead: true,
      canUpdate: true,
    };
  });

  it('should show a list of roles', async () => {
    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });

  it('should go to the edit page when a row is clicked and the user can update but not create', async () => {
    mockAllowedActions = {
      canCreate: false,
      canDelete: false,
      canRead: true,
      canUpdate: true,
    };

    const { findByText, user } = render(<ListPage />);

    await user.click(await findByText('Super Admin'));

    expect(mockNavigate).toHaveBeenCalledWith('1');
  });
});
