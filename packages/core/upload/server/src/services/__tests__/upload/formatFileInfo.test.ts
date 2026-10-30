import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';

// Set up mock before service creation
global.strapi = {
  plugins: {
    upload: {
      services: {
        'image-manipulation': imageManipulation,
        file: {
          getFolderPath: () => '/a-folder-path',
        },
      },
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
} as any;

const uploadService = createUploadService({} as any);

describe('formatFileInfo', () => {
  test('Generates hash', async () => {
    const fileData = {
      filename: 'File Name.png',
      type: 'image/png',
      size: 1000 * 1000,
    };

    expect(await uploadService.formatFileInfo(fileData)).toMatchObject({
      name: 'File Name.png',
      hash: expect.stringContaining('File_Name'),
      ext: '.png',
      mime: 'image/png',
      size: 1000,
    });
  });

  test('Replaces reserved and unsafe characters for URLs and files in hash', async () => {
    const fileData = {
      filename: 'File%&Näme.png',
      type: 'image/png',
      size: 1000 * 1000,
    };

    expect(await uploadService.formatFileInfo(fileData)).toMatchObject({
      name: 'File%&Näme.png',
      hash: expect.stringContaining('File_and_Naeme'),
      ext: '.png',
      mime: 'image/png',
      size: 1000,
    });
  });

  test('Prevents invalid characters in file name', async () => {
    const fileData = {
      filename: 'filename.png\u0000',
      type: 'image/png',
      size: 1000 * 1000,
    };

    expect(uploadService.formatFileInfo(fileData)).rejects.toThrowError(
      'File name contains invalid characters'
    );
  });

  test('Overrides name with fileInfo', async () => {
    const fileData = {
      filename: 'File Name.png',
      type: 'image/png',
      size: 1000 * 1000,
    };

    const fileInfo = {
      name: 'Custom File Name.png',
    };

    expect(await uploadService.formatFileInfo(fileData, fileInfo)).toMatchObject({
      name: fileInfo.name,
      hash: expect.stringContaining('Custom_File_Name'),
      ext: '.png',
      mime: 'image/png',
      size: 1000,
    });
  });

  test('Sets alternativeText and caption', async () => {
    const fileData = {
      filename: 'File Name.png',
      type: 'image/png',
      size: 1000 * 1000,
    };

    const fileInfo = {
      alternativeText: 'some text',
      caption: 'caption this',
    };

    expect(await uploadService.formatFileInfo(fileData, fileInfo)).toMatchObject({
      name: 'File Name.png',
      caption: fileInfo.caption,
      alternativeText: fileInfo.alternativeText,
      hash: expect.stringContaining('File_Name'),
      ext: '.png',
      mime: 'image/png',
      size: 1000,
    });
  });

  test('Set a path folder', async () => {
    const fileData = {
      filename: 'File Name.png',
      type: 'image/png',
      size: 1000 * 1000,
    };

    const fileMetas = {
      path: 'folder',
    };

    expect(await uploadService.formatFileInfo(fileData, {}, fileMetas)).toMatchObject({
      name: 'File Name.png',
      ext: '.png',
      mime: 'image/png',
      size: 1000,
      path: expect.stringContaining('folder'),
    });
  });

  describe('refId / ref / field', () => {
    const fileData = {
      filename: 'File Name.png',
      type: 'image/png',
      size: 1000 * 1000,
    };
    const ref = 'api::dog.dog';
    const field = 'pic';
    const documentId = 'qovkpekciob2wt8qyd51mg8k';

    let findMany: jest.Mock;
    let getModel: jest.Mock;
    let service: ReturnType<typeof createUploadService>;

    beforeEach(() => {
      findMany = jest.fn();
      getModel = jest.fn().mockReturnValue({ uid: ref });

      service = createUploadService({
        strapi: { getModel, db: { query: jest.fn().mockReturnValue({ findMany }) } },
      } as any);
    });

    test('A numeric refId links the file to that entry without a lookup', async () => {
      const result = await service.formatFileInfo(fileData, {}, { refId: '3', ref, field });

      expect(findMany).not.toHaveBeenCalled();
      expect(result.related).toEqual([{ id: '3', __type: ref, __pivot: { field } }]);
    });

    test('A documentId refId links the file to every entry row with that documentId', async () => {
      findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);

      const result = await service.formatFileInfo(fileData, {}, { refId: documentId, ref, field });

      expect(findMany).toHaveBeenCalledWith({ where: { documentId }, select: ['id'] });
      expect(result.related).toEqual([
        { id: 3, __type: ref, __pivot: { field } },
        { id: 4, __type: ref, __pivot: { field } },
      ]);
    });

    test('A digit-leading documentId refId is looked up as a documentId', async () => {
      findMany.mockResolvedValue([{ id: 3 }]);

      const result = await service.formatFileInfo(
        fileData,
        {},
        { refId: '1abcdefghijklmnopqrstuvw', ref, field }
      );

      expect(findMany).toHaveBeenCalledWith({
        where: { documentId: '1abcdefghijklmnopqrstuvw' },
        select: ['id'],
      });
      expect(result.related).toEqual([{ id: 3, __type: ref, __pivot: { field } }]);
    });

    test('An unknown documentId refId throws a NotFoundError', async () => {
      findMany.mockResolvedValue([]);

      await expect(
        service.formatFileInfo(fileData, {}, { refId: 'unknowndocumentid0000000', ref, field })
      ).rejects.toMatchObject({ name: 'NotFoundError' });
    });

    test('A refId for an unknown ref is kept as is', async () => {
      getModel.mockReturnValue(undefined);

      const result = await service.formatFileInfo(
        fileData,
        {},
        { refId: documentId, ref: 'api::unknown.unknown', field }
      );

      expect(findMany).not.toHaveBeenCalled();
      expect(result.related).toEqual([
        { id: documentId, __type: 'api::unknown.unknown', __pivot: { field } },
      ]);
    });

    test('Without ref and field the file is not linked', async () => {
      const result = await service.formatFileInfo(fileData, {}, { refId: documentId });

      expect(findMany).not.toHaveBeenCalled();
      expect(result.related).toBeUndefined();
    });
  });
});
