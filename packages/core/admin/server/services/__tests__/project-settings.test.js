'use strict';

const {
  parseFilesData,
  getProjectSettings,
  deleteOldFiles,
  updateProjectSettings,
} = require('../project-settings');

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: () => null,
}));

const storeSet = jest.fn();
const providerDelete = jest.fn();
global.strapi = {
  dirs: {
    public: 'publicDir',
  },
  config: {
    get: () => ({ provider: 'local' }),
  },
  plugins: {
    upload: {
      provider: {
        async uploadStream(file) {
          file.url = `/uploads/${file.hash}`;
        },
        delete: providerDelete,
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
            size: 123,
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
        url: 'file/url',
        width: 100,
        height: 100,
        ext: 'png',
        size: 123,
        provider: 'local',
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
          size: 123,
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
          provider: 'local',
          size: 123,
          stream: null,
          width: 100,
          height: 100,
          tmpPath: '/tmp/filename_123',
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
          ext: 'png',
          size: 123,
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
          name: 'file.png',
          type: 'image/png',
          url: 'file/url',
        },
      };

      await deleteOldFiles({ previousSettings, newSettings });

      expect(providerDelete).not.toBeCalled();
    });

    it('Does not delete when there is no new file uploaded', async () => {
      const previousSettings = {
        menuLogo: {
          size: 24085,
          name: 'file.png',
          type: 'image/png',
          provider: 'local',
          url: 'file/url',
        },
      };

      const newSettings = previousSettings;

      await deleteOldFiles({ previousSettings, newSettings });

      expect(providerDelete).not.toBeCalled();
    });

    it('Deletes when inputs are explicitely set to null', async () => {
      const previousSettings = {
        menuLogo: {
          size: 24085,
          name: 'file.png',
          type: 'image/png',
          provider: 'local',
          url: 'file/url',
        },
      };

      const newSettings = { menuLogo: null };

      await deleteOldFiles({ previousSettings, newSettings });

      expect(providerDelete).toBeCalledTimes(1);
    });

    it('Deletes when new files are uploaded', async () => {
      const previousSettings = {
        menuLogo: {
          size: 24085,
          name: 'file.png',
          type: 'image/png',
          provider: 'local',
          url: 'file/url',
          hash: '123',
        },
      };

      const newSettings = {
        menuLogo: {
          ...previousSettings.menuLogo,
          hash: '456',
        },
      };

      await deleteOldFiles({ previousSettings, newSettings });

      expect(providerDelete).toBeCalledTimes(1);
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
          size: 123,
          stream: null,
          width: 100,
          height: 100,
          tmpPath: '/tmp/filename_123',
          url: '/uploads/filename_123.png',
        },
      };

      const expectedOutput = {
        menuLogo: {
          name: 'filename.png',
          hash: 'filename_123',
          url: '/uploads/filename_123.png',
          width: 100,
          height: 100,
          ext: '.png',
          size: 123,
        },
      };

      await updateProjectSettings({ ...body, ...files });

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

      await updateProjectSettings({ ...body, ...files });

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
          url: 'file/url',
          width: 100,
          height: 100,
          ext: 'png',
          size: 123,
          provider: 'local',
        },
      };

      await updateProjectSettings({ ...body, ...files });

      expect(storeSet).toBeCalledTimes(1);
      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: expectedOutput,
      });
    });
  });
});
