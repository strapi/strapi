import { useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook, screen } from '@tests/utils';

import { useBulkMove, FileWithType, FolderWithType } from '../useBulkMove';

const FIXTURE_ASSETS: FileWithType[] = [
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
    hash: 'hash1',
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
    hash: 'hash2',
    provider: 'local',
  },
];

const FIXTURE_FOLDERS: FolderWithType[] = [
  {
    id: 11,
    type: 'folder',
    name: 'Folder 1',
    path: '/11',
    pathId: 11,
  },

  {
    id: 12,
    type: 'folder',
    name: 'Folder 2',
    path: '/12',
    pathId: 12,
  },
];

const FIXTURE_DESTINATION_FOLDER_ID = 1;

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    post: jest.fn((url, payload) => {
      const res: { data: { data: { files: FileWithType[]; folders: FolderWithType[] } } } = {
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

function setup(...args: Parameters<typeof useBulkMove>) {
  return renderHook(() => useBulkMove(...args));
}

describe('useBulkMove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does call the proper endpoint', async () => {
    const {
      result: { current },
    } = setup();
    const { move } = current;

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_ASSETS);
    });
    const { post } = useFetchClient();

    expect(post).toHaveBeenCalledWith('/upload/actions/bulk-move', expect.any(Object));
  });

  test('does properly collect all asset ids', async () => {
    const {
      result: { current },
    } = setup();
    const { move } = current;
    const { post } = useFetchClient();

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_ASSETS);
    });

    expect(post).toHaveBeenCalledWith(expect.any(String), {
      destinationFolderId: FIXTURE_DESTINATION_FOLDER_ID,
      fileIds: FIXTURE_ASSETS.map(({ id }) => id),
    });
  });

  test('does properly collect all folder ids', async () => {
    const {
      result: { current },
    } = setup();
    const { move } = current;
    const { post } = useFetchClient();

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_FOLDERS);
    });

    expect(post).toHaveBeenCalledWith(expect.any(String), {
      destinationFolderId: FIXTURE_DESTINATION_FOLDER_ID,
      folderIds: FIXTURE_FOLDERS.map(({ id }) => id),
    });
  });

  test('does properly collect folder and asset ids', async () => {
    const {
      result: { current },
    } = setup();
    const { move } = current;
    const { post } = useFetchClient();

    await act(async () => {
      await move(FIXTURE_DESTINATION_FOLDER_ID, [...FIXTURE_FOLDERS, ...FIXTURE_ASSETS]);
    });

    expect(post).toHaveBeenCalledWith(expect.any(String), {
      destinationFolderId: FIXTURE_DESTINATION_FOLDER_ID,
      fileIds: FIXTURE_ASSETS.map(({ id }) => id),
      folderIds: FIXTURE_FOLDERS.map(({ id }) => id),
    });
  });

  test('does re-fetch assets, if files were deleted', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_ASSETS);
    });

    await screen.findByText('Elements have been moved successfully.');
  });

  test('does re-fetch folders, if folders were deleted', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.move(FIXTURE_DESTINATION_FOLDER_ID, FIXTURE_FOLDERS);
    });

    await screen.findByText('Elements have been moved successfully.');
  });
});
