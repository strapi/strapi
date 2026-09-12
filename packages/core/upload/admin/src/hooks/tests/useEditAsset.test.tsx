/* eslint-disable check-file/filename-naming-convention */
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useEditAsset } from '../useEditAsset';

import type { File as FileAsset } from '../../../../shared/contracts/files';

const FIXTURE_ASSET = {
  id: 1,
  name: 'asset.png',
  alternativeText: null,
  caption: null,
  folder: null,
} as unknown as FileAsset;

const FIXTURE_FILE = new File(['asset'], 'asset.png', { type: 'image/png' });

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
 * Mounts the queries `useEditAsset` refetches on success, so we can assert which
 * of them are actually re-run. The `assets` query is seeded twice: once mounted
 * (active) and once only in the cache (inactive).
 */
function setup(client: QueryClient, queryFns: Record<string, jest.Mock>) {
  return renderHook(
    () => {
      useQuery(['upload', 'assets', { page: 1 }], queryFns.activeAssets);
      useQuery(['upload', 'asset-count'], queryFns.assetCount);
      useQuery(['upload', 'folders'], queryFns.folders);

      return useEditAsset();
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

describe('useEditAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({ data: FIXTURE_ASSET });
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
      await result.current.editAsset(FIXTURE_ASSET, FIXTURE_FILE);
    });

    await waitFor(() => expect(queryFns.activeAssets).toHaveBeenCalledTimes(2));
    expect(queryFns.assetCount).toHaveBeenCalledTimes(2);
    expect(queryFns.folders).toHaveBeenCalledTimes(2);
    expect(inactiveAssets).toHaveBeenCalledTimes(1);
  });

  test('posts the asset fileInfo to the upload endpoint', async () => {
    const client = createClient();
    const queryFns = {
      activeAssets: jest.fn().mockResolvedValue([]),
      assetCount: jest.fn().mockResolvedValue(0),
      folders: jest.fn().mockResolvedValue([]),
    };

    const { result } = setup(client, queryFns);

    await act(async () => {
      await result.current.editAsset(FIXTURE_ASSET, FIXTURE_FILE);
    });

    expect(postMock).toHaveBeenCalledWith(
      `/upload?id=${FIXTURE_ASSET.id}`,
      expect.any(FormData),
      expect.objectContaining({ signal: expect.anything() })
    );

    const [, formData] = postMock.mock.calls[0];

    expect(formData.get('files')).toBe(FIXTURE_FILE);
    expect(JSON.parse(formData.get('fileInfo') as string)).toEqual(
      expect.objectContaining({ name: FIXTURE_ASSET.name })
    );
  });
});
