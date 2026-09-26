/* eslint-disable check-file/filename-naming-convention */
import { useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook, waitFor, RenderHookResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useFolderStructure } from '../useFolderStructure';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
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
const ComponentFixture = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        {children}
      </IntlProvider>
    </QueryClientProvider>
  );
};

function setup(
  ...args: Parameters<typeof useFolderStructure>
): Promise<
  RenderHookResult<ReturnType<typeof useFolderStructure>, Parameters<typeof useFolderStructure>>
> {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useFolderStructure(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useFolderStructure', () => {
  test('fetches data from the right URL', async () => {
    const { get } = useFetchClient();

    await setup();

    await waitFor(() => {
      expect(get).toBeCalledWith('/upload/folder-structure');
    });
  });

  test('transforms the required object keys', async () => {
    const { result } = await setup({});

    await waitFor(() => {
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
});
