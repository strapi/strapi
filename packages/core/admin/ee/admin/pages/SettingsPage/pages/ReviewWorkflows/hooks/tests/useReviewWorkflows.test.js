import React from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';

import { useFetchClient } from '@strapi/helper-plugin';

import { useReviewWorkflows } from '../useReviewWorkflows';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
  }),
  useNotification: jest.fn().mockReturnValue(() => {}),
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
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
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
      params: { populate: 'stages' },
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

  test('send put request on the updateWorkflowStages mutation', async () => {
    const { put } = useFetchClient();
    const idFixture = 1;
    const stagesFixture = [{ id: 2, name: 'stage' }];

    put.mockResolvedValue({
      data: {},
    });

    const { result, waitFor } = await setup(idFixture);

    await act(async () => {
      await result.current.updateWorkflowStages(idFixture, stagesFixture);
    });

    await waitFor(() => expect(result.current.workflows.isLoading).toBe(false));

    expect(put).toBeCalledWith(`/admin/review-workflows/workflows/${idFixture}/stages`, {
      data: stagesFixture,
    });
  });
});
