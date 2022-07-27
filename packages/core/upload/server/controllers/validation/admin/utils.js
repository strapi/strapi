'use strict';

const { isNil } = require('lodash/fp');
const { getService } = require('../../../utils');

const folderExists = async folderId => {
  if (isNil(folderId)) {
    return true;
  }

  const exists = await getService('folder').exists({ id: folderId });

  return exists;
};

module.exports = {
  folderExists,
};
