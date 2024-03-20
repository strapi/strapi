import { render, waitFor } from '@tests/utils';

import { useRBAC } from '../../../../../hooks/useRBAC';
import { ListView } from '../ListView';

jest.mock('../../../../../hooks/useRBAC', () => ({
  useRBAC: jest.fn().mockReturnValue({
    isLoading: false,
    allowedActions: {
      canCreate: true,
      canDelete: true,
      canRead: true,
      canUpdate: true,
      canRegenerate: true,
    },
  }),
}));

jest.mock('../../../../../components/GuidedTour/Provider');

describe('ADMIN | Pages | API TOKENS | ListPage', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should show a list of api tokens', async () => {
    const { findByText } = render(<ListView />);

    await findByText('My super token');
    await findByText('This describe my super token');
  });

  it('should not show the create button when the user does not have the rights to create', async () => {
    jest.mocked(useRBAC).mockReturnValue({
      isLoading: false,
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: true,
        canRegenerate: true,
      },
    });

    const { queryByTestId } = render(<ListView />);

    await waitFor(() => expect(queryByTestId('create-api-token-button')).not.toBeInTheDocument());
  });

  it('should show the delete button when the user have the rights to delete', async () => {
    jest.mocked(useRBAC).mockReturnValue({
      isLoading: false,
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    });

    const { findByRole } = render(<ListView />);

    await findByRole('button', { name: 'Delete My super token' });
  });
});
