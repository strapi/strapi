'use strict';

const fs = require('fs');
const path = require('path');
const { pick } = require('lodash');

const PROJECT_SETTINGS_FILE_INPUTS = ['menuLogo'];

const parseFilesData = async files => {
  const formatedFilesData = {};

  await Promise.all(
    PROJECT_SETTINGS_FILE_INPUTS.map(async inputName => {
      // Skip empty file inputs
      if (!files[inputName]) {
        return;
      }

      const getStream = () => fs.createReadStream(files[inputName].path);

      // Add formated data for the upload provider
      formatedFilesData[inputName] = strapi
        .plugin('upload')
        .service('upload')
        .formatFileInfo({
          filename: files[inputName].name,
          type: files[inputName].type,
          size: files[inputName].size,
        });

      // Add image dimensions
      Object.assign(
        formatedFilesData[inputName],
        await strapi
          .plugin('upload')
          .service('image-manipulation')
          .getDimensions({ getStream })
      );

      // Add file path, url and stream
      const url = `/uploads/${formatedFilesData[inputName].hash}${formatedFilesData[inputName].ext}`;
      Object.assign(formatedFilesData[inputName], {
        path: path.join(strapi.dirs.public, url),
        stream: getStream(),
        tmpPath: files[inputName].path,
        url,
      });
    })
  );

  return formatedFilesData;
};

const getProjectSettings = async () => {
  const store = await strapi.store({ type: 'core', name: 'admin' });
  const projectSettings = await store.get({ key: 'project-settings' });

  PROJECT_SETTINGS_FILE_INPUTS.forEach(inputName => {
    if (projectSettings[inputName]) {
      projectSettings[inputName] = pick(projectSettings[inputName], [
        'name',
        'url',
        'width',
        'height',
      ]);
    }
  });

  return projectSettings;
};

const uploadFiles = async files => {
  return Promise.all(Object.values(files).map(strapi.plugin('upload').provider.uploadStream));
};

const deleteOldFiles = async ({ previousSettings, newSettings }) => {
  return Promise.all(
    PROJECT_SETTINGS_FILE_INPUTS.map(async inputName => {
      // Skip if there was no previous file
      if (!previousSettings[inputName]) {
        return;
      }

      // Skip if the file was not changed
      if (
        newSettings[inputName] &&
        previousSettings[inputName].path === newSettings[inputName].path
      ) {
        return;
      }

      // There was a previous file and an new file was uploaded
      // Remove the previous file
      fs.unlinkSync(previousSettings[inputName].path);
    })
  );
};

const updateProjectSettings = async ({ body, files }) => {
  const store = await strapi.store({ type: 'core', name: 'admin' });
  const previousSettings = await store.get({ key: 'project-settings' });

  const newSettings = {
    ...body,
    ...files,
  };

  PROJECT_SETTINGS_FILE_INPUTS.forEach(inputName => {
    if (newSettings[inputName] !== undefined && !(typeof newSettings[inputName] === 'object')) {
      // If the user input exists but is not a formdata "file" remove the file
      newSettings[inputName] = null;
    } else if (!newSettings[inputName]) {
      // If the user input is undefined reuse previous setting (do not update field)
      newSettings[inputName] = previousSettings[inputName];
    } else {
      // Update the file
      newSettings[inputName] = {
        name: newSettings[inputName].name,
        path: newSettings[inputName].path,
        url: newSettings[inputName].url,
        width: newSettings[inputName].width,
        height: newSettings[inputName].height,
      };
    }
  });

  // No await to proceed asynchronously
  uploadFiles(files);
  deleteOldFiles({ previousSettings, newSettings });

  await store.set({
    key: 'project-settings',
    value: { ...previousSettings, ...newSettings },
  });

  return getProjectSettings();
};

module.exports = {
  deleteOldFiles,
  parseFilesData,
  getProjectSettings,
  updateProjectSettings,
};
