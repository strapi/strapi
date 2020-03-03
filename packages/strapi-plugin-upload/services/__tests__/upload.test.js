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
  });
});
