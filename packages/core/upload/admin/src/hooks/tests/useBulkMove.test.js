import { useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook, screen } from '@tests/utils';

import { useBulkMove } from '../useBulkMove';

const FIXTURE_ASSETS = [
  {
    id: 1,
    type: 'asset',
  },

  {
    id: 2,
    type: 'asset',
  },
];

const FIXTURE_FOLDERS = [
  {
    id: 11,
    type: 'folder',
  },

  {
    id: 12,
    type: 'folder',
  },
];

const FIXTURE_DESTINATION_FOLDER_ID = 1;

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    post: jest.fn((url, payload) => {
      const res = { data: { data: {} } };

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

function setup(...args) {
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
