import { useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook, screen } from '@tests/utils';

import { BulkDeleteFiles } from '../../../../shared/contracts/files';
import { BulkDeleteFolders } from '../../../../shared/contracts/folders';
import { useBulkRemove } from '../useBulkRemove';

const FIXTURE_ASSETS = [
  {
    id: 1,
    type: 'asset',
    name: 'asset1',
    path: 'path/to/asset1',
    pathId: 1,
    hash: 'hash1',
  },

  {
    id: 2,
    type: 'asset',
    name: 'asset2',
    path: 'path/to/asset2',
    pathId: 2,
    hash: 'hash2',
  },
];

const FIXTURE_FOLDERS = [
  {
    id: 11,
    type: 'folder',
    name: 'folder1',
    path: 'path/to/folder1',
    pathId: 11,
  },

  {
    id: 12,
    type: 'folder',
    name: 'folder2',
    path: 'path/to/folder2',
    pathId: 12,
  },
];

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    post: jest.fn((url, payload) => {
      const res: BulkDeleteFiles.Response | BulkDeleteFolders.Response = {
        data: {
          data: {
            files: [],
            folders: [],
          },
        },
      };

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
