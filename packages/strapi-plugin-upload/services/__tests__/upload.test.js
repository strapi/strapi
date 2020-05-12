const uploadService = require('../Upload');

describe('Upload service', () => {
  describe('formatFileInfo', () => {
    test('Generates hash', () => {
      const fileData = {
        filename: 'File Name.png',
        type: 'image/png',
        size: 1000 * 1000,
      };

      expect(uploadService.formatFileInfo(fileData)).toMatchObject({
        name: 'File Name',
        hash: expect.stringContaining('File_Name'),
        ext: '.png',
        mime: 'image/png',
        size: 1000,
      });
    });

    test('Overrides name with fileInfo', () => {
      const fileData = {
        filename: 'File Name.png',
        type: 'image/png',
        size: 1000 * 1000,
      };

      const fileInfo = {
        name: 'Custom File Name',
      };

      expect(uploadService.formatFileInfo(fileData, fileInfo)).toMatchObject({
        name: fileInfo.name,
        hash: expect.stringContaining('Custom_File_Name'),
        ext: '.png',
        mime: 'image/png',
        size: 1000,
      });
    });

    test('Sets alternativeText and caption', () => {
      const fileData = {
        filename: 'File Name.png',
        type: 'image/png',
        size: 1000 * 1000,
      };

      const fileInfo = {
        alternativeText: 'some text',
        caption: 'caption this',
      };

      expect(uploadService.formatFileInfo(fileData, fileInfo)).toMatchObject({
        name: 'File Name',
        caption: fileInfo.caption,
        alternativeText: fileInfo.alternativeText,
        hash: expect.stringContaining('File_Name'),
        ext: '.png',
        mime: 'image/png',
        size: 1000,
      });
    });

    test('Set a path folder', () => {
      const fileData = {
        filename: 'File Name.png',
        type: 'image/png',
        size: 1000 * 1000,
      };

      const fileMetas = {
        path: 'folder',
      };

      expect(uploadService.formatFileInfo(fileData, {}, fileMetas)).toMatchObject({
        name: 'File Name',
        ext: '.png',
        mime: 'image/png',
        size: 1000,
        path: expect.stringContaining('folder'),
      });
    });
  });
});
