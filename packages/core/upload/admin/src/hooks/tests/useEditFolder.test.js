import { useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook } from '@tests/utils';

import { useEditFolder } from '../useEditFolder';

const FOLDER_CREATE_FIXTURE = {
  name: 'test-folder',
  parent: 1,
};

const FOLDER_EDIT_FIXTURE = {
  id: 2,
  name: 'test-folder',
  parent: 1,
};

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    put: jest.fn().mockResolvedValue({ name: 'folder-edited' }),
    post: jest.fn().mockResolvedValue({ name: 'folder-created' }),
  }),
}));

function setup(...args) {
  return renderHook(() => useEditFolder(...args));
}

describe('useEditFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls the proper endpoint when creating a folder (post)', async () => {
    const { post } = useFetchClient();
    const {
      result: { current },
    } = setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(FOLDER_CREATE_FIXTURE);
    });

    expect(post).toHaveBeenCalledWith('/upload/folders/', expect.any(Object));
  });

  test('calls the proper endpoint when creating a folder (put)', async () => {
    const { put } = useFetchClient();

    const {
      result: { current },
    } = setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(
        {
          name: FOLDER_EDIT_FIXTURE.name,
          parent: FOLDER_EDIT_FIXTURE.parent,
        },
        FOLDER_EDIT_FIXTURE.id
      );
    });

    expect(put).toHaveBeenCalledWith('/upload/folders/2', expect.any(Object));
  });

  test('calls the proper endpoint when editing a folder', async () => {
    const { put } = useFetchClient();
    const {
      result: { current },
    } = setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(
        {
          name: FOLDER_EDIT_FIXTURE.name,
          parent: FOLDER_EDIT_FIXTURE.parent,
        },
        FOLDER_EDIT_FIXTURE.id
      );
    });

    expect(put).toHaveBeenCalledWith('/upload/folders/2', expect.any(Object));
  });

  test('does not call toggleNotification in case of success', async () => {
    const {
      result: { current },
    } = setup();
    const { editFolder } = current;

    await act(async () => {
      await editFolder(
        {
          name: FOLDER_EDIT_FIXTURE.name,
          parent: FOLDER_EDIT_FIXTURE.parent,
        },
        FOLDER_EDIT_FIXTURE.id
      );
    });
  });
});
