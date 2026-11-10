import { errors } from '@strapi/utils';

import { getService } from '../../../../utils';
import { validateMoveManyFoldersFiles } from '../folder-file';

jest.mock('../../../../utils');

describe('validateMoveManyFoldersFiles', () => {
  beforeEach(() => {
    jest.mocked(getService).mockReturnValue({ exists: jest.fn(async () => true) } as any);
  });

  test('rejects with a ValidationError when the destination folder is deleted after it was checked', async () => {
    // `exists` saw the destination, but it is gone when the folders are compared with it.
    global.strapi = {
      db: {
        query: () => ({
          // The moved folders, then the destination's children (none: it is gone).
          findMany: jest.fn(async ({ where }) =>
            where.parent === undefined ? [{ name: 'moved', path: '/1' }] : []
          ),
          findOne: jest.fn(async () => null),
        }),
      },
    } as any;

    await expect(
      validateMoveManyFoldersFiles({ folderIds: [1], fileIds: [], destinationFolderId: 2 })
    ).rejects.toThrow(new errors.ValidationError('destination folder does not exist'));
  });
});
