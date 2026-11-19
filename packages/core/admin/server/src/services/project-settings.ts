import fs from 'fs';
import { pick } from 'lodash';
import { emitAudit, file as fileUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { GetProjectSettings, UpdateProjectSettings } from '../../../shared/contracts/admin';
import { AUDITED_EVENTS, getProjectSettingsChanges } from '../audit-logs/project-settings';
import type { ImageManipulationService, UploadService } from '../types/plugin-services';
import { hasUploadProviderMethod } from '../utils/upload-provider';

const PROJECT_SETTINGS_FILE_INPUTS = ['menuLogo', 'authLogo'] as const;

interface UploadFile {
  name: string;
  path: string;
  type: string;
  size: number;
  stream: fs.ReadStream;
  buffer: Buffer;
  tmpPath: string;
  hash: string;
  url: string;
  width: number;
  height: number;
  ext: string;
  provider: unknown;
}

type FormattedFiles = Partial<
  Record<keyof UpdateProjectSettings.Request['files'], Partial<UploadFile>>
>;

const parseFilesData = async (files: UpdateProjectSettings.Request['files']) => {
  const formatedFilesData: FormattedFiles = {};

  await Promise.all(
    PROJECT_SETTINGS_FILE_INPUTS.map(async (inputName) => {
      const file = files[inputName];

      // Skip empty file inputs
      if (!file) {
        return;
      }

      const getStream = () => fs.createReadStream(file.filepath);

      // Add formated data for the upload provider
      formatedFilesData[inputName] = await strapi
        .plugin('upload')
        .service<UploadService<Partial<UploadFile>>>('upload')
        .formatFileInfo({
          filename: file.originalFilename,
          type: file.mimetype,
          size: file.size,
        });

      // Add image dimensions
      Object.assign(
        formatedFilesData[inputName]!,
        await strapi
          .plugin('upload')
          .service<ImageManipulationService>('image-manipulation')
          .getDimensions({ getStream })
      );

      // Add file path, and stream
      Object.assign(formatedFilesData[inputName]!, {
        stream: getStream(),
        tmpPath: file.filepath,
        // TODO
        // @ts-expect-error define the correct return type
        provider: strapi.config.get('plugin::upload').provider,
      });
    })
  );

  return formatedFilesData;
};

const getProjectSettings = async (): Promise<GetProjectSettings.Response> => {
  const store = strapi.store({ type: 'core', name: 'admin' });

  // Returns an object with file inputs names as key and null as value
  const defaultProjectSettings = PROJECT_SETTINGS_FILE_INPUTS.reduce((prev: any, cur: any) => {
    prev[cur] = null;
    return prev;
  }, {});

  const projectSettings = {
    ...defaultProjectSettings,
    ...((await store.get({ key: 'project-settings' })) as object | null),
  };

  // Filter file input fields
  PROJECT_SETTINGS_FILE_INPUTS.forEach((inputName) => {
    if (!projectSettings[inputName]) {
      return;
    }

    projectSettings[inputName] = pick(projectSettings[inputName], [
      'name',
      'url',
      'width',
      'height',
      'ext',
      'size',
    ]);
  });

  return projectSettings;
};

type NewLogoFile = Partial<UploadFile> & Pick<UploadFile, 'stream'>;

const uploadFile = async (file: NewLogoFile) => {
  const provider = strapi.plugin('upload').provider;

  if (hasUploadProviderMethod(provider, 'uploadStream') === true) {
    return provider.uploadStream(file);
  }

  // A provider can implement only `upload`, which reads a buffer (same fallback as the upload plugin).
  // Remove the consumed stream so the provider does not read it instead of the buffer.
  const bufferedFile: Partial<UploadFile> = file;
  bufferedFile.buffer = await fileUtils.streamToBuffer(file.stream);
  delete bufferedFile.stream;

  if (hasUploadProviderMethod(provider, 'upload') === false) {
    throw new TypeError('The upload provider implements neither uploadStream nor upload');
  }

  return provider.upload(bufferedFile);
};

const uploadFiles = async (files: LogoFiles = {}) => {
  // Call the provider upload function for each file
  return Promise.all(
    Object.values(files)
      .filter((file): file is NewLogoFile => file?.stream instanceof fs.ReadStream)
      .map(uploadFile)
  );
};

/**
 * Deletes the stored logos that the update replaces or removes. `updateProjectSettings` passes the
 * stored settings, `null` when the store has no row, and the settings it is about to store.
 */
const deleteOldFiles = async ({
  previousSettings,
  newSettings,
}: Core.IsStrict extends true
  ? {
      previousSettings: Strapi.Registries.Stores['core_admin_project-settings'] | null;
      newSettings: Parameters<typeof updateProjectSettings>[0];
    }
  : any) => {
  return Promise.all(
    PROJECT_SETTINGS_FILE_INPUTS.map(async (inputName) => {
      // Skip if the store doesn't contain project settings
      if (!previousSettings) {
        return;
      }

      // Skip if there was no previous file
      if (!previousSettings[inputName]) {
        return;
      }

      // Skip if the file was not changed
      if (
        newSettings[inputName] &&
        previousSettings[inputName].hash === newSettings[inputName].hash
      ) {
        return;
      }

      // Skip if the file was not uploaded with the current provider
      // TODO
      // @ts-expect-error define the correct return type
      if (strapi.config.get('plugin::upload').provider !== previousSettings[inputName].provider) {
        return;
      }

      // There was a previous file and an new file was uploaded
      // Remove the previous file. A failed delete only leaves an orphan file in the storage:
      // log it rather than failing the settings update or leaving an unhandled rejection.
      try {
        const provider = strapi.plugin('upload').provider;

        if (hasUploadProviderMethod(provider, 'delete') === false) {
          throw new TypeError('The upload provider does not implement delete');
        }

        await provider.delete(previousSettings[inputName]);
      } catch (error) {
        strapi.log.warn(`Could not delete the previous ${inputName} file`, { error });
      }
    })
  );
};

type LogoFiles = { [K in keyof FormattedFiles]: FormattedFiles[K] | null };

const updateProjectSettings = async (
  newSettings: Omit<UpdateProjectSettings.Request['body'], 'menuLogo' | 'authLogo'> & LogoFiles
) => {
  const store = strapi.store({ type: 'core', name: 'admin' });
  const previousSettings = (await store.get({ key: 'project-settings' })) as any;
  const files = pick(newSettings, PROJECT_SETTINGS_FILE_INPUTS);

  await uploadFiles(files);

  PROJECT_SETTINGS_FILE_INPUTS.forEach((inputName) => {
    // If the user input exists but is not a formdata "file" remove it
    if (newSettings[inputName] !== undefined && !(typeof newSettings[inputName] === 'object')) {
      newSettings[inputName] = null;
      return;
    }

    // If the user input is undefined reuse previous setting (do not update field)
    if (!newSettings[inputName] && previousSettings) {
      newSettings[inputName] = previousSettings[inputName];
      return;
    }

    // Update the file
    newSettings[inputName] = pick(newSettings[inputName], [
      'name',
      'hash',
      'url',
      'width',
      'height',
      'ext',
      'size',
      'provider',
    ]);
  });

  await store.set({
    key: 'project-settings',
    value: { ...previousSettings, ...newSettings },
  });

  // Delete the replaced files once the new settings are saved
  await deleteOldFiles({ previousSettings, newSettings });

  const changes = getProjectSettingsChanges(previousSettings, newSettings);

  if (Object.keys(changes).length > 0) {
    await emitAudit({ strapi }, AUDITED_EVENTS.PROJECT_SETTINGS_UPDATE, { changes });
  }

  return getProjectSettings();
};

export { deleteOldFiles, parseFilesData, getProjectSettings, updateProjectSettings };
