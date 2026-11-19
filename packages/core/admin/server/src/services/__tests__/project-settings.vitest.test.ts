import os from 'os';
import path from 'path';
import type { Readable } from 'stream';
import { text } from 'stream/consumers';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { emitAudit } from '@strapi/utils';
import {
  parseFilesData,
  getProjectSettings,
  deleteOldFiles,
  updateProjectSettings,
} from '../project-settings';

vi.mock('@strapi/utils', async () => ({
  ...(await vi.importActual<typeof import('@strapi/utils')>('@strapi/utils')),
  emitAudit: vi.fn(),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  const createReadStream = () => null;

  return { ...actual, createReadStream, default: { ...actual, createReadStream } };
});

const actualFs = await vi.importActual<typeof import('fs')>('fs');

const storeSet = vi.fn();
const providerDelete = vi.fn();
const logWarn = vi.fn();
global.strapi = {
  log: { warn: logWarn },
  dirs: {
    public: 'publicDir',
  },
  config: {
    get: () => ({ provider: 'local' }),
  },
  plugins: {
    upload: {
      provider: {
        async uploadStream(file: any) {
          file.url = `/uploads/${file.hash}`;
        },
        delete: providerDelete,
      },
      services: {
        upload: {
          formatFileInfo: async () => ({
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
      authLogo: {
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
} as any;

describe('Project setting', () => {
  beforeEach(vi.clearAllMocks);

  describe('parseFilesData', () => {
    it('Should parse valid files object', async () => {
      const files = {
        menuLogo: {
          size: 123,
          filepath: '/tmp/filename_123',
          originalFilename: 'file.png',
          mimetype: 'image/png',
        },
        authLogo: {
          size: 123,
          filepath: '/tmp/filename_123',
          originalFilename: 'file.png',
          mimetype: 'image/png',
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
        authLogo: {
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

      // @ts-expect-error - test purpose
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
        authLogo: {
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
        authLogo: null,
      };

      const newSettings = {
        menuLogo: {
          size: 24085,
          name: 'file.png',
          type: 'image/png',
          url: 'file/url',
        },
        authLogo: {
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
        authLogo: {
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
        authLogo: {
          size: 24085,
          name: 'file.png',
          type: 'image/png',
          provider: 'local',
          url: 'file/url',
        },
      };

      const newSettings = { menuLogo: null, authLogo: null };

      await deleteOldFiles({ previousSettings, newSettings });

      expect(providerDelete).toBeCalledTimes(2);
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
        authLogo: {
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
        authLogo: {
          ...previousSettings.menuLogo,
          hash: '456',
        },
      };

      await deleteOldFiles({ previousSettings, newSettings });

      expect(providerDelete).toBeCalledTimes(2);
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
        authLogo: {
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
        authLogo: {
          name: 'filename.png',
          hash: 'filename_123',
          url: '/uploads/filename_123.png',
          width: 100,
          height: 100,
          ext: '.png',
          size: 123,
        },
      };

      // @ts-expect-error - test purpose
      await updateProjectSettings({ ...body, ...files });

      expect(storeSet).toBeCalledTimes(1);
      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: expectedOutput,
      });
      expect(emitAudit).toHaveBeenCalledTimes(1);
      expect(emitAudit).toHaveBeenCalledWith(expect.anything(), 'project-settings.update', {
        changes: {
          menuLogo: { before: 'name', after: 'filename.png' },
          authLogo: { before: 'name', after: 'filename.png' },
        },
      });
    });

    it('Updates the project settings (delete)', async () => {
      const body = { menuLogo: '', authLogo: '' };
      const files = {};

      const expectedOutput = {
        menuLogo: null,
        authLogo: null,
      };

      // @ts-expect-error - test purpose
      await updateProjectSettings({ ...body, ...files });

      expect(storeSet).toBeCalledTimes(1);
      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: expectedOutput,
      });
      expect(emitAudit).toHaveBeenCalledWith(expect.anything(), 'project-settings.update', {
        changes: {
          menuLogo: { before: 'name', after: null },
          authLogo: { before: 'name', after: null },
        },
      });
    });

    it('Deletes the replaced files only after the new settings are saved', async () => {
      await updateProjectSettings({ menuLogo: '', authLogo: '' } as any);

      expect(providerDelete).toHaveBeenCalledTimes(2);
      expect(storeSet.mock.invocationCallOrder[0]).toBeLessThan(
        Math.min(...providerDelete.mock.invocationCallOrder)
      );
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
        authLogo: {
          name: 'name',
          url: 'file/url',
          width: 100,
          height: 100,
          ext: 'png',
          size: 123,
          provider: 'local',
        },
      };

      await updateProjectSettings({ ...body, ...files } as any);

      expect(storeSet).toBeCalledTimes(1);
      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: expectedOutput,
      });
      expect(emitAudit).not.toHaveBeenCalled();
    });
  });

  describe('updateProjectSettings logo upload', () => {
    const logoContent = 'logo-bytes';
    let tmpDir: string;
    let logoPath: string;
    let uploadProvider: unknown;

    beforeEach(async () => {
      tmpDir = await actualFs.promises.mkdtemp(path.join(os.tmpdir(), 'project-settings-'));
      logoPath = path.join(tmpDir, 'logo.png');
      await actualFs.promises.writeFile(logoPath, logoContent);
      uploadProvider = global.strapi.plugins.upload.provider;
    });

    afterEach(async () => {
      global.strapi.plugins.upload.provider = uploadProvider;
      await actualFs.promises.rm(tmpDir, { recursive: true, force: true });
    });

    const createLogoFile = () => ({
      name: 'logo.png',
      hash: 'logo_123',
      ext: '.png',
      mime: 'image/png',
      size: logoContent.length,
      width: 100,
      height: 100,
      tmpPath: logoPath,
      stream: actualFs.createReadStream(logoPath),
    });

    it('Streams the logo to a provider that implements uploadStream', async () => {
      const uploadStream = vi.fn(async (file: { hash: string; url?: string; stream: Readable }) => {
        file.url = `/uploads/${file.hash}.png`;
        await text(file.stream);
      });
      global.strapi.plugins.upload.provider = { uploadStream, delete: vi.fn() };

      await updateProjectSettings({ menuLogo: createLogoFile() } as any);

      expect(uploadStream).toHaveBeenCalledTimes(1);
      expect(uploadStream.mock.calls[0][0].stream).toBeInstanceOf(actualFs.ReadStream);
      expect(storeSet.mock.calls[0][0].value.menuLogo.url).toBe('/uploads/logo_123.png');
    });

    it('Falls back to upload with a buffer when the provider has no uploadStream', async () => {
      const upload = vi.fn(
        async (file: { hash: string; url?: string; buffer?: Buffer; stream?: unknown }) => {
          file.url = `/uploads/${file.hash}.png`;
        }
      );
      global.strapi.plugins.upload.provider = { upload, delete: vi.fn() };

      await updateProjectSettings({ menuLogo: createLogoFile() } as any);

      expect(upload).toHaveBeenCalledTimes(1);
      const uploadedFile = upload.mock.calls[0][0];
      expect(uploadedFile.buffer?.toString()).toBe(logoContent);
      expect(uploadedFile.stream).toBeUndefined();
      expect(storeSet.mock.calls[0][0].value.menuLogo.url).toBe('/uploads/logo_123.png');
    });
  });

  describe('when the provider fails to delete the previous logo', () => {
    let uploadProvider: unknown;
    const deleteError = new Error('Storage unavailable');
    const failingDelete = vi.fn();

    const previousLogo = {
      name: 'name',
      hash: 'previous_hash',
      url: 'file/url',
      ext: 'png',
      size: 123,
      provider: 'local',
    };

    beforeEach(() => {
      uploadProvider = global.strapi.plugins.upload.provider;
      failingDelete.mockReset().mockRejectedValue(deleteError);
      global.strapi.plugins.upload.provider = { delete: failingDelete };
    });

    afterEach(() => {
      global.strapi.plugins.upload.provider = uploadProvider;
    });

    it('deleteOldFiles resolves and logs the failure', async () => {
      const previousSettings = { menuLogo: previousLogo, authLogo: previousLogo };
      const newSettings = { menuLogo: null, authLogo: null };

      await expect(deleteOldFiles({ previousSettings, newSettings })).resolves.toBeDefined();

      expect(failingDelete).toHaveBeenCalledTimes(2);
      expect(logWarn).toHaveBeenCalledTimes(2);
      expect(logWarn).toHaveBeenCalledWith(
        expect.stringContaining('menuLogo'),
        expect.objectContaining({ error: deleteError })
      );
    });

    it('updateProjectSettings still saves the settings', async () => {
      await expect(
        updateProjectSettings({ menuLogo: '', authLogo: '' } as any)
      ).resolves.toBeDefined();

      expect(storeSet).toBeCalledWith({
        key: 'project-settings',
        value: { menuLogo: null, authLogo: null },
      });
      expect(logWarn).toHaveBeenCalledTimes(2);
    });
  });
});
