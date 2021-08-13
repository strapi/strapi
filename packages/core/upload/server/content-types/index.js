'use strict';

const fileModel = require('../../models/File');

module.exports = {
  [fileModel.info.singularName]: { schema: fileModel },
};
