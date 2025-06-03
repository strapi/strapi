import fs from 'fs';
import { pick } from 'lodash';
import { GetProjectSettings, UpdateProjectSettings } from '../../../shared/contracts/admin';

const PROJECT_SETTINGS_FILE_INPUTS = ['menuLogo', 'authLogo'] as const;

interface UploadFile {
  name: string;
  path: string;
  type: string;
  size: number;
  stream: fs.ReadStream;
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
        .service('upload')
        .formatFileInfo({
          filename: file.originalFilename,
          type: file.mimetype,
          size: file.size,
        });

      // Add image dimensions
      Object.assign(
        formatedFilesData[inputName]!,
        await strapi.plugin('upload').service('image-manipulation').getDimensions({ getStream })
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
    // @ts-expect-error spread can be applied to return value
    ...(await store.get({ key: 'project-settings' })),
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

const uploadFiles = async (files: LogoFiles = {}) => {
  // Call the provider upload function for each file
  return Promise.all(
    Object.values(files)
      .filter((file) => file?.stream instanceof fs.ReadStream)
      .map((file) => strapi.plugin('upload').provider.uploadStream(file))
  );
};

const deleteOldFiles = async ({ previousSettings, newSettings }: any) => {
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
      // Remove the previous file
      strapi.plugin('upload').provider.delete(previousSettings[inputName]);
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

  // No await to proceed asynchronously
  deleteOldFiles({ previousSettings, newSettings });

  await store.set({
    key: 'project-settings',
    value: { ...previousSettings, ...newSettings },
  });

  return getProjectSettings();
};

export { deleteOldFiles, parseFilesData, getProjectSettings, updateProjectSettings };
