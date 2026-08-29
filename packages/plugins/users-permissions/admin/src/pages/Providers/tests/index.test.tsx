import * as React from 'react';

import { render } from '@strapi/strapi/admin/test';

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
    const { getByTestId, findByText } = render(<ProvidersPage />);

    await findByText('email');

    expect(getByTestId('enable-email')).toHaveTextContent('Enabled');
    expect(getByTestId('enable-discord')).toHaveTextContent('Disabled');
  });
});
