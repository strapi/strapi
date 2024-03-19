import React from 'react';

import { TestUtils } from '@strapi/strapi/admin';

import { ProvidersPage } from '../index';

jest.mock('@strapi/strapi/admin', () => ({
  ...jest.requireActual('@strapi/strapi/admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canUpdate: false },
  })),
}));

describe('Admin | containers | ProvidersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of providers', async () => {
    const { getByText, getByTestId } = TestUtils.render(<ProvidersPage />);

    await TestUtils.waitFor(() => {
      expect(getByText('email')).toBeInTheDocument();
      expect(getByTestId('enable-email').textContent).toEqual('Enabled');
      expect(getByTestId('enable-discord').textContent).toEqual('Disabled');
    });
  });
});
