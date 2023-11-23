import React from 'react';

import { useRBAC } from '@strapi/helper-plugin';
import { render, waitFor } from '@tests/utils';

import ListView from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useQueryParams: jest.fn().mockReturnValue([
    {
      query: {
        sort: 'test:ASC',
      },
    },
  ]),
}));

describe('ADMIN | Pages | TRANSFER TOKENS | ListPage', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should show a list of transfer tokens', async () => {
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: true,
        canDelete: true,
        canRead: true,
        canUpdate: true,
        canRegenerate: true,
      },
    });

    const { getByText } = render(<ListView />);

    await waitFor(() => expect(getByText('My super token')).toBeInTheDocument());
    await waitFor(() => expect(getByText('This describe my super token')).toBeInTheDocument());
  });

  it('should not show the create button when the user does not have the rights to create', async () => {
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: true,
        canRegenerate: true,
      },
    });

    const { queryByTestId } = render(<ListView />);

    await waitFor(() =>
      expect(queryByTestId('create-transfer-token-button')).not.toBeInTheDocument()
    );
  });

  it('should show the delete button when the user have the rights to delete', async () => {
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    });

    const { container } = render(<ListView />);

    await waitFor(() =>
      expect(container.querySelector('button[name="delete"]')).toBeInTheDocument()
    );
  });

  it('should show the read button when the user have the rights to read and not to update', async () => {
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    });

    const { container } = render(<ListView />);

    await waitFor(() => expect(container.querySelector('a[title*="Read"]')).toBeInTheDocument());
  });
});
