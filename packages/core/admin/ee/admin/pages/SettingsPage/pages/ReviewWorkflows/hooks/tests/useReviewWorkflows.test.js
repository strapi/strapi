import React from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';

import { useFetchClient } from '@strapi/helper-plugin';

import { useReviewWorkflows } from '../useReviewWorkflows';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: {} }),
  }),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// eslint-disable-next-line react/prop-types
const ComponentFixture = ({ children }) => (
  <IntlProvider locale="en" messages={{}}>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </IntlProvider>
);

function setup(id) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useReviewWorkflows(id), { wrapper: ComponentFixture }));
    });
  });
}

describe('useReviewWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetch all workflows when calling the hook without a workflow id', async () => {
    const { get } = useFetchClient();

    get.mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            stages: [],
          },

          {
            id: 2,
            stages: [],
          },
        ],
      },
    });

    const { result, waitFor } = await setup();

    expect(result.current.workflows.isLoading).toBe(true);
    expect(get).toBeCalledWith('/admin/review-workflows/workflows/', {
      params: { sort: 'name:asc', populate: 'stages' },
    });

    await waitFor(() => expect(result.current.workflows.isLoading).toBe(false));

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        workflows: expect.objectContaining({
          data: expect.arrayContaining([{ id: expect.any(Number), stages: expect.any(Array) }]),
        }),
      })
    );
  });

  test('fetch a single workflow when calling the hook with a workflow id', async () => {
    const { get } = useFetchClient();
    const idFixture = 1;

    get.mockResolvedValue({
      data: {
        data: {
          id: idFixture,
          stages: [],
        },
      },
    });

    const { result, waitFor } = await setup(idFixture);

    expect(result.current.workflows.isLoading).toBe(true);
    expect(get).toBeCalledWith(
      `/admin/review-workflows/workflows/${idFixture}`,
      expect.any(Object)
    );

    await waitFor(() => expect(result.current.workflows.isLoading).toBe(false));

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        workflows: expect.objectContaining({
          data: expect.objectContaining({ id: expect.any(Number), stages: expect.any(Array) }),
        }),
      })
    );
  });

  test('refetchWorkflow() re-fetches the loaded default workflow', async () => {
    const { result } = await setup();

    const spy = jest.spyOn(client, 'refetchQueries');

    await act(async () => {
      result.current.refetchWorkflow();
    });

    expect(spy).toBeCalledWith(['review-workflows', 'default']);
  });

  test('refetchWorkflow() re-fetches the loaded workflow id', async () => {
    const { result } = await setup(1);

    const spy = jest.spyOn(client, 'refetchQueries');

    await act(async () => {
      result.current.refetchWorkflow();
    });

    expect(spy).toBeCalledWith(['review-workflows', 1]);
  });
});
