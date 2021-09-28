'use strict';

const registerUploadMiddlware = require('./controllers/upload-middleware');

module.exports = async () => {
  await registerUploadMiddlware();
};
