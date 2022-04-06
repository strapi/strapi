'use strict';

const { unlinkSync } = require('fs');
const {
  parseFilesData,
  getProjectSettings,
  deleteOldFiles,
  updateProjectSettings,
} = require('../project-settings');

jest.mock('fs', () => ({
  createReadStream: () => null,
  unlinkSync: jest.fn(),
}));

const storeSet = jest.fn();
global.strapi = {
  dirs: {
    public: 'publicDir',
  },
  plugins: {
    upload: {
      provider: {
        uploadStream: jest.fn(),
      },
      services: {
        upload: {
          formatFileInfo: () => ({
            name: 'filename.png',
            alternativeText: null,
            caption: null,
            hash: 'filename_123',
            ext: '.png',
            mime: 'image/png',
            size: 1024 * 1024,
          }),
        },
        'image-manipulation': {
          getDimensions: () => ({ width: 100, height: 100 }),
        },
      },
    },
  },
  store: () => ({
    get: () => ({
      menuLogo: {
        name: 'name',
        path: 'path/to/file',
        url: 'file/url',
        width: 100,
        height: 100,
      },
    }),
    set: storeSet,
  }),
};

describe('Project setting', () => {
  beforeEach(jest.resetAllMocks);

  describe('parseFilesData', () => {
    it('Should parse valid files object', async () => {
      const files = {
        menuLogo: {
          size: 24085,
          path: '/tmp/filename_123',
          name: 'file.png',
          type: 'image/png',
        },
      };

      const expectedOutput = {
        menuLogo: {
          name: 'filename.png',
          alternativeText: null,
          caption: null,
          hash: 'filename_123',
          ext: '.png',
          mime: 'image/png',
          size: 1024 * 1024,
          stream: null,
          width: 100,
          height: 100,
          path: 'publicDir/uploads/filename_123.png',
          tmpPath: '/tmp/filename_123',
          url: '/uploads/filename_123.png',
        },
      };

      const parsedFiles = await parseFilesData(files);

      expect(parsedFiles).toEqual(expectedOutput);
    });

    it('Should skip empty files object with no error', async () => {
      const files = {};
      const expectedOutput = {};

      const parsedFiles = await parseFilesData(files);
      expect(parsedFiles).toEqual(expectedOutput);
    });
  });

  describe('getProjectSettings', () => {
    it('Should return project settings from store (only the right subset of fields)', async () => {
      const projectSettings = await getProjectSettings();

      const expectedOutput = {
        menuLogo: {
          name: 'name',
          url: 'file/url',
          width: 100,
          height: 100,
        },
      };

      expect(projectSettings).toStrictEqual(expectedOutput);
    });
  });

  describe('deleteOldFiles', () => {
    it('Does not delete when there was no previous file', async () => {
      const previousSettings = {
        menuLogo: null,
      };

      const newSettings = {
        menuLogo: {
          size: 24085,
          path: '/tmp/filename_123',
          name: 'file.png',
          type: 'image/png',
        },
      };

      await deleteOldFiles(previousSettings, newSettings);

      expect(unlinkSync).not.toBeCalled();
    });

    it('Does not delete when there is no new file uploaded', async () => {
      const previousSettings = {
        menuLogo: {
          size: 24085,
          path: '/tmp/filename_123',
          name: 'file.png',
          type: 'image/png',
        },
      };

      const newSettings = previousSettings;

      await deleteOldFiles(previousSettings, newSettings);

      expect(unlinkSync).not.toBeCalled();
    });

    it('Deletes when inputs are explicitely set to null', async () => {
      const previousSettings = {
        menuLogo: {
          size: 24085,
          path: '/tmp/filename_123',
          name: 'file.png',
          type: 'image/png',
        },
      };

      const newSettings = { menuLogo: null };

      await deleteOldFiles(previousSettings, newSettings);

      expect(unlinkSync).toBeCalledTimes(1);
      expect(unlinkSync).toBeCalledWith(previousSettings.menuLogo.path);
    });

    it('Deletes when new files are uploaded', async () => {
      const previousSettings = {
        menuLogo: {
          size: 24085,
          path: '/tmp/filename_123',
          name: 'file.png',
          type: 'image/png',
        },
      };

      const newSettings = {
        menuLogo: {
          ...previousSettings.menuLogo,
          path: 'another/path',
        },
      };

      await deleteOldFiles(previousSettings, newSettings);

      expect(unlinkSync).toBeCalledTimes(1);
      expect(unlinkSync).toBeCalledWith(previousSettings.menuLogo.path);
    });
  });

  describe('updateProjectSettings', () => {
    it('Updates the project settings', async () => {
      const body = {};
      const files = {
        menuLogo: {
          name: 'filename.png',
          alternativeText: null,
          caption: null,
          hash: 'filename_123',
          ext: '.png',
          mime: 'image/png',
          size: 1024 * 1024,
          stream: null,
          width: 100,
          height: 100,
          path: 'publicDir/uploads/filename_123.png',
          tmpPath: '/tmp/filename_123',
          url: '/uploads/filename_123.png',
        },
      };

      const expectedOutput = {
        menuLogo: {
          name: 'filename.png',
          path: 'publicDir/uploads/filename_123.png',
          url: '/uploads/filename_123.png',
          width: 100,
          height: 100,
        },
      };

      await updateProjectSettings(body, files);

      expect(storeSet).toBeCalledTimes(1);
      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: expectedOutput,
      });
    });

    it('Updates the project settings (delete)', async () => {
      const body = { menuLogo: '' };
      const files = {};

      const expectedOutput = {
        menuLogo: null,
      };

      await updateProjectSettings(body, files);

      expect(storeSet).toBeCalledTimes(1);
      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: expectedOutput,
      });
    });

    it('Keeps the previous project settings', async () => {
      const body = {};
      const files = {};

      const expectedOutput = {
        menuLogo: {
          name: 'name',
          path: 'path/to/file',
          url: 'file/url',
          width: 100,
          height: 100,
        },
      };

      await updateProjectSettings(body, files);

      expect(storeSet).toBeCalledTimes(1);
      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: expectedOutput,
      });
    });
  });
});
