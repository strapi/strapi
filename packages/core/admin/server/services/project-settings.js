'use strict';

const fs = require('fs');
const { transform } = require('lodash');

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

const uploadProjectSettingsFiles = async files => {
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

module.exports = {
  uploadProjectSettingsFiles,
};
