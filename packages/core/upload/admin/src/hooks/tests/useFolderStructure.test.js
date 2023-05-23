import React from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';

import { useFetchClient } from '@strapi/helper-plugin';

import { useFolderStructure } from '../useFolderStructure';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            name: '1',
            children: [],
          },

          {
            id: 2,
            name: '2',
            children: [
              {
                id: 21,
                name: '21',
                children: [],
              },
            ],
          },
        ],
      },
    }),
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
function ComponentFixture({ children }) {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        {children}
      </IntlProvider>
    </QueryClientProvider>
  );
}

function setup(...args) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useFolderStructure(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useFolderStructure', () => {
  test('fetches data from the right URL', async () => {
    const { get } = useFetchClient();
    const { waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    expect(get).toBeCalledWith('/upload/folder-structure');
  });

  test('transforms the required object keys', async () => {
    const { result, waitForNextUpdate } = await setup({});

    await waitForNextUpdate();

    expect(result.current.data).toStrictEqual([
      {
        label: 'Media Library',
        value: null,
        children: [
          {
            value: 1,
            label: '1',
            children: [],
          },

          {
            value: 2,
            label: '2',
            children: [
              {
                value: 21,
                label: '21',
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  });
});
