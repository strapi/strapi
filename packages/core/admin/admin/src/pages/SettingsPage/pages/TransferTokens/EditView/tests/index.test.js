import React from 'react';

import { render, waitFor } from '@tests/utils';

import EditView from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(() => ({
    allowedActions: {
      canCreate: true,
      canDelete: true,
      canRead: true,
      canUpdate: true,
      canRegenerate: true,
    },
  })),
}));

describe('ADMIN | Pages | TRANSFER TOKENS | EditView', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders and matches the snapshot when editing existing token', async () => {
    const { getByText } = render(<EditView />, {
      initialEntries: ['/settings/transfer-tokens/1'],
    });

    await waitFor(() => expect(getByText('My super token')).toBeInTheDocument());
    expect(getByText('This describe my super token')).toBeInTheDocument();
    expect(getByText('Regenerate')).toBeInTheDocument();
  });
});
