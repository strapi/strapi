import React from 'react';

import { render, waitFor } from '@tests/utils';

import AuthenticatedApp from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  /**
   * DISABLES NPS SURVEY
   */
  usePersistentState: jest.fn().mockImplementation(() => [{ enabled: false }, jest.fn()]),
  auth: {
    getUserInfo: () => ({ firstname: 'kai', lastname: 'doe', email: 'testemail@strapi.io' }),
  },
  useGuidedTour: jest.fn(() => ({
    setGuidedTourVisibility: jest.fn(),
  })),
}));

jest.mock('../../PluginsInitializer', () => ({
  PluginsInitializer() {
    return <div>PluginsInitializer</div>;
  },
}));

describe('AuthenticatedApp', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not crash', async () => {
    const { queryByText } = render(<AuthenticatedApp />);

    await waitFor(() => expect(queryByText(/Loading/)).not.toBeInTheDocument());

    expect(queryByText(/PluginsInitializer/)).toBeInTheDocument();
  });
});
