import * as React from 'react';

import { render, waitFor } from '@strapi/strapi/admin/test';

import { ProvidersPage } from '../index';

/**
 * Mock the cropper import to avoid having an error
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});

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
    const { getByText, getByTestId } = render(<ProvidersPage />);

    await waitFor(() => {
      expect(getByText('email')).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(getByTestId('enable-email')).toHaveTextContent('Enabled');
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(getByTestId('enable-discord')).toHaveTextContent('Disabled');
    });
  });
});
