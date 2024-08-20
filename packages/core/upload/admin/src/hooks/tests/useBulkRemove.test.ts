import { useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook, screen } from '@tests/utils';

import { useBulkRemove, AssetWithType, FolderWithType } from '../useBulkRemove';

const FIXTURE_ASSETS: AssetWithType[] = [
  {
    id: 1,
    type: 'asset',
    size: 100,
    createdAt: '2023-08-01T00:00:00.000Z',
    mime: 'image/png',
    name: 'Asset 1',
    updatedAt: '2023-08-01T00:00:00.000Z',
    url: '/assets/1',
    folder: null,
    folderPath: '/',
    documentId: 'document1',
    hash: 'hash1',
    locale: null,
    provider: 'local',
  },

  {
    id: 2,
    type: 'asset',
    size: 200,
    createdAt: '2023-08-01T00:00:00.000Z',
    mime: 'image/png',
    name: 'Asset 2',
    updatedAt: '2023-08-01T00:00:00.000Z',
    url: '/assets/2',
    folder: null,
    folderPath: '/',
    documentId: 'document2',
    hash: 'hash2',
    locale: null,
    provider: 'local',
  },
];

const FIXTURE_FOLDERS: FolderWithType[] = [
  {
    id: 11,
    type: 'folder',
    name: 'Folder 1',
    path: '/11',
    createdAt: '2023-08-01T00:00:00.000Z',
    updatedAt: '2023-08-01T00:00:00.000Z',
    documentId: 'document11',
    pathId: '/11',
    publishedAt: '2023-08-01T00:00:00.000Z',
    locale: null,
  },

  {
    id: 12,
    type: 'folder',
    name: 'Folder 2',
    path: '/12',
    createdAt: '2023-08-01T00:00:00.000Z',
    updatedAt: '2023-08-01T00:00:00.000Z',
    documentId: 'document12',
    pathId: '/12',
    publishedAt: '2023-08-01T00:00:00.000Z',
    locale: null,
  },
];

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    post: jest.fn((url, payload) => {
      const res: {
        data: {
          data: {
            files?: AssetWithType[];
            folders?: FolderWithType[];
          };
        };
      } = { data: { data: {} } };

      if (payload?.fileIds) {
        res.data.data.files = FIXTURE_ASSETS;
      }

      if (payload?.folderIds) {
        res.data.data.folders = FIXTURE_FOLDERS;
      }

      return Promise.resolve(res);
    }),
  }),
}));

function setup(...args: Parameters<typeof useBulkRemove>) {
  return renderHook(() => useBulkRemove(...args));
}

describe('useBulkRemove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does call the proper endpoint', async () => {
    const {
      result: { current },
    } = setup();
    const { remove } = current;
    const { post } = useFetchClient();

    await act(async () => {
      await remove(FIXTURE_ASSETS);
    });

    expect(post).toHaveBeenCalledWith('/upload/actions/bulk-delete', expect.any(Object));
  });

  test('does properly collect all asset ids', async () => {
    const {
      result: { current },
    } = setup();
    const { remove } = current;
    const { post } = useFetchClient();

    await act(async () => {
      await remove(FIXTURE_ASSETS);
    });

    expect(post).toHaveBeenCalledWith(expect.any(String), {
      fileIds: FIXTURE_ASSETS.map(({ id }) => id),
    });
  });

  test('does properly collect all folder ids', async () => {
    const {
      result: { current },
    } = setup();
    const { remove } = current;
    const { post } = useFetchClient();

    await act(async () => {
      await remove(FIXTURE_FOLDERS);
    });

    expect(post).toHaveBeenCalledWith(expect.any(String), {
      folderIds: FIXTURE_FOLDERS.map(({ id }) => id),
    });
  });

  test('does properly collect folder and asset ids', async () => {
    const {
      result: { current },
    } = setup();
    const { remove } = current;
    const { post } = useFetchClient();

    await act(async () => {
      await remove([...FIXTURE_FOLDERS, ...FIXTURE_ASSETS]);
    });

    expect(post).toHaveBeenCalledWith(expect.any(String), {
      fileIds: FIXTURE_ASSETS.map(({ id }) => id),
      folderIds: FIXTURE_FOLDERS.map(({ id }) => id),
    });
  });

  test('does re-fetch assets, if files were deleted', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.remove(FIXTURE_ASSETS);
    });

    await screen.findByText('Elements have been successfully deleted.');
  });

  test('does re-fetch folders, if folders were deleted', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.remove(FIXTURE_FOLDERS);
    });

    await screen.findByText('Elements have been successfully deleted.');
  });
});
