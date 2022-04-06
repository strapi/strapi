'use strict';

const fs = require('fs');
const { transform } = require('lodash');

const PROJECT_SETTINGS_FILE_INPUTS = ['menuLogo'];

const getFormatedFileData = data => ({
  path: data.path,
  ...strapi
    .plugin('upload')
    .service('upload')
    .formatFileInfo({
      filename: data.name,
      type: data.type,
      size: data.size,
    }),
});

const uploadFiles = async files => {
  const formatedFilesData = transform(files, (result, value, key) => {
    if (value) {
      result[key] = getFormatedFileData(value);
    }
  });

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
        width: 0,
        height: 0,
      };
    }
  });

  return store.set({ key: 'project-settings', value: { ...previousSettings, ...newSettings } });
};

module.exports = {
  uploadFiles,
  updateProjectSettings,
};
