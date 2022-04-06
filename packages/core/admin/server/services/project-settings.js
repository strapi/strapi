'use strict';

const fs = require('fs');

const PROJECT_SETTINGS_FILE_INPUTS = ['menuLogo'];

const parseFilesData = async files => {
  const formatedFilesData = {};

  await Promise.all(
    PROJECT_SETTINGS_FILE_INPUTS.map(async inputName => {
      // Do not parse empty file inputs
      if (!files[inputName]) {
        return;
      }

      const getStream = () => fs.createReadStream(files[inputName].path);

      formatedFilesData[inputName] = {
        path: files[inputName].path,
        stream: getStream(),
      };

      // Add formated data for the upload provider
      Object.assign(
        formatedFilesData[inputName],
        strapi
          .plugin('upload')
          .service('upload')
          .formatFileInfo({
            filename: files[inputName].name,
            type: files[inputName].type,
            size: files[inputName].size,
          })
      );

      // Add image dimensions
      Object.assign(
        formatedFilesData[inputName],
        await strapi
          .plugin('upload')
          .service('image-manipulation')
          .getDimensions({ getStream })
      );
    })
  );

  return formatedFilesData;
};

const uploadFiles = async files => {
  return Promise.all(Object.values(files).map(strapi.plugin('upload').provider.uploadStream));
};

const updateProjectSettings = async (body, files) => {
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
        url: 'test',
        width: newSettings[inputName].width,
        height: newSettings[inputName].height,
      };
    }
  });

  // No await to proceed asynchronously
  uploadFiles(files);

  return store.set({ key: 'project-settings', value: { ...previousSettings, ...newSettings } });
};

module.exports = {
  parseFilesData,
  uploadFiles,
  updateProjectSettings,
};
