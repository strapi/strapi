/* eslint-disable check-file/filename-naming-convention */
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useBulkEdit } from '../useBulkEdit';

const FIXTURE_UPDATES = [
  {
    id: 1,
    fileInfo: {
      name: 'renamed.png',
      alternativeText: null,
      caption: null,
      folder: null,
    },
  },
];

const postMock = jest.fn();
const toggleNotificationMock = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification() {
    return { toggleNotification: toggleNotificationMock };
  },
  useFetchClient() {
    return { post: postMock };
  },
}));

const createClient = () =>
  new QueryClient({
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

/**
 * Mounts the queries `useBulkEdit` refetches on success, so we can assert which
 * of them are actually re-run. The `assets` query is seeded twice: once mounted
 * (active) and once only in the cache (inactive).
 */
function setup(client: QueryClient, queryFns: Record<string, jest.Mock>) {
  return renderHook(
    () => {
      useQuery(['upload', 'assets', { page: 1 }], queryFns.activeAssets);
      useQuery(['upload', 'asset-count'], queryFns.assetCount);
      useQuery(['upload', 'folders'], queryFns.folders);

      return useBulkEdit();
    },
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <IntlProvider locale="en" messages={{}}>
            {children}
          </IntlProvider>
        </QueryClientProvider>
      ),
    }
  );
}

describe('useBulkEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({ data: [{ id: 1 }] });
  });

  test('calls the bulk-update endpoint with the given updates', async () => {
    const client = createClient();
    const queryFns = {
      activeAssets: jest.fn().mockResolvedValue([]),
      assetCount: jest.fn().mockResolvedValue(0),
      folders: jest.fn().mockResolvedValue([]),
    };

    const { result } = setup(client, queryFns);

    await act(async () => {
      await result.current.edit(FIXTURE_UPDATES);
    });

    expect(postMock).toHaveBeenCalledWith('/upload/actions/bulk-update', {
      updates: FIXTURE_UPDATES,
    });

    await waitFor(() =>
      expect(toggleNotificationMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      )
    );
  });

  test('refetches only the active asset, asset-count and folder queries', async () => {
    const client = createClient();
    const inactiveAssets = jest.fn().mockResolvedValue([]);
    await client.prefetchQuery(['upload', 'assets', { page: 2 }], inactiveAssets);

    const queryFns = {
      activeAssets: jest.fn().mockResolvedValue([]),
      assetCount: jest.fn().mockResolvedValue(0),
      folders: jest.fn().mockResolvedValue([]),
    };

    const { result } = setup(client, queryFns);

    await waitFor(() => expect(queryFns.activeAssets).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(queryFns.assetCount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(queryFns.folders).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.edit(FIXTURE_UPDATES);
    });

    await waitFor(() => expect(queryFns.activeAssets).toHaveBeenCalledTimes(2));
    expect(queryFns.assetCount).toHaveBeenCalledTimes(2);
    expect(queryFns.folders).toHaveBeenCalledTimes(2);
    expect(inactiveAssets).toHaveBeenCalledTimes(1);
  });

  test('does not refetch when no file was updated', async () => {
    postMock.mockResolvedValue({ data: [] });

    const client = createClient();
    const queryFns = {
      activeAssets: jest.fn().mockResolvedValue([]),
      assetCount: jest.fn().mockResolvedValue(0),
      folders: jest.fn().mockResolvedValue([]),
    };

    const { result } = setup(client, queryFns);

    await waitFor(() => expect(queryFns.activeAssets).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.edit(FIXTURE_UPDATES);
    });

    expect(queryFns.activeAssets).toHaveBeenCalledTimes(1);
    expect(queryFns.assetCount).toHaveBeenCalledTimes(1);
    expect(queryFns.folders).toHaveBeenCalledTimes(1);
  });
});
