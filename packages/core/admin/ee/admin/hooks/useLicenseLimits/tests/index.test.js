import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { useFetchClient } from '@strapi/helper-plugin';
import { renderHook } from '@testing-library/react';
import { useQuery } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import useLicenseLimits from '..';

jest.mock('@strapi/helper-plugin', () => ({
  // TODO: Replace with msw
  useFetchClient: jest.fn(() => ({
    get: jest.fn(),
  })),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    },
  })),
}));

// TODO: Replace with msw
jest.mock('react-query', () => ({
  useQuery: jest.fn(),
}));

const setup = (...args) =>
  renderHook(() => useLicenseLimits(...args), {
    wrapper({ children }) {
      return (
        <Provider
          store={createStore((state) => state, {
            admin_app: { permissions: fixtures.permissions.app },
          })}
        >
          {children}
        </Provider>
      );
    },
  });

describe('useLicenseLimits', () => {
  it('should fetch the license limit information', async () => {
    const data = { data: { id: 1, name: 'Test License' } };
    useQuery.mockReturnValue({
      data: { id: 1, name: 'Test License' },
      isLoading: false,
    });

    const { result } = setup();

    expect(useFetchClient).toHaveBeenCalled();
    expect(useQuery).toHaveBeenCalledWith(['ee', 'license-limit-info'], expect.any(Function), {
      enabled: true,
    });
    expect(result.current.license.data).toEqual(data.data);
  });

  it('data should be undefined if there is an API error', async () => {
    // const data = { data: { id: 1, name: 'Test License' } };
    useQuery.mockReturnValue({
      isError: true,
    });

    const { result } = setup();

    expect(useFetchClient).toHaveBeenCalled();
    expect(useQuery).toHaveBeenCalledWith(['ee', 'license-limit-info'], expect.any(Function), {
      enabled: true,
    });
    expect(result.current.license.data).toEqual(undefined);
  });
});
