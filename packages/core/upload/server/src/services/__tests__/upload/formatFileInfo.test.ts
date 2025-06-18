import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';

const uploadService = createUploadService({} as any);

describe('Upload service', () => {
  beforeAll(() => {
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
    } as any;
  });

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
  });
});
