import { useRBAC } from '@strapi/helper-plugin';
import { render, waitFor } from '@tests/utils';

import { ListView } from '../ListView';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn().mockReturnValue({
    isLoading: false,
    setIsLoading: jest.fn(),
    allowedActions: {
      canCreate: true,
      canDelete: true,
      canRead: true,
      canUpdate: true,
      canRegenerate: true,
    },
  }),
}));

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
      setIsLoading: jest.fn(),
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
      setIsLoading: jest.fn(),
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

  it('should show the read button when the user have the rights to read and not to update', async () => {
    jest.mocked(useRBAC).mockReturnValue({
      isLoading: false,
      setIsLoading: jest.fn(),
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    });

    const { findByRole } = render(<ListView />);

    await findByRole('link', { name: 'Read My super token' });
  });
});
