import React from 'react';

import { render, waitFor } from '@strapi/strapi/admin/test';

import { AdvancedSettingsPage } from '../index';

jest.mock('@strapi/strapi/admin', () => ({
  ...jest.requireActual('@strapi/strapi/admin'),
  useRBAC: jest.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true },
  })),
}));

describe('ADMIN | Pages | Settings | Advanced Settings', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByRole, queryByText } = render(<AdvancedSettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Advanced Settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(
      getByRole('combobox', { name: 'Default role for authenticated users' })
    ).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'One account per email address' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Enable sign-ups' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Enable email confirmation' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Reset password page' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Redirection url' })).toBeInTheDocument();
  });
});
