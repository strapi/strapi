'use strict';

const fs = require('fs');

const PROJECT_SETTINGS_FILE_INPUTS = ['menuLogo'];

const getFormatedFilesData = async files => {
  const formatedFilesData = {};

  const results = PROJECT_SETTINGS_FILE_INPUTS.map(async inputName => {
    if (!files[inputName]) {
      return;
    }

    formatedFilesData[inputName] = {
      path: files[inputName].path,

      // Get file info
      ...strapi
        .plugin('upload')
        .service('upload')
        .formatFileInfo({
          filename: files[inputName].name,
          type: files[inputName].type,
          size: files[inputName].size,
        }),

      // Get image file dimensions
      ...(await strapi
        .plugin('upload')
        .service('image-manipulation')
        .getDimensions({ getStream: () => fs.createReadStream(files[inputName].path) })),
    };
  });

  await Promise.all(results);

  return formatedFilesData;
};

const uploadFiles = async files => {
  const formatedFilesData = getFormatedFilesData(files);

  Object.values(formatedFilesData).map(data =>
    // Do not await to upload asynchronously
    strapi.plugin('upload').provider.uploadStream({
      ...data,
      stream: fs.createReadStream(data.path),
    })
  );

  return formatedFilesData;
};

const updateProjectSettings = async (body, uploadedFiles) => {
  const store = await strapi.store({ type: 'core', name: 'admin' });

  const previousSettings = await store.get({ key: 'project-settings' });

  const newSettings = {
    ...body,
    ...uploadedFiles,
  };

  PROJECT_SETTINGS_FILE_INPUTS.forEach(inputName => {
    if (newSettings[inputName] !== undefined && !(typeof newSettings[inputName] === 'object')) {
      // If the user input exists but is not a formdata "file" remove the file
      newSettings[inputName] = null;

      // TODO unlink the file
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

  return store.set({ key: 'project-settings', value: { ...previousSettings, ...newSettings } });
};

module.exports = {
  getFormatedFilesData,
  uploadFiles,
  updateProjectSettings,
};
