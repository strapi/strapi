'use strict';

const { resolve } = require('path');
const { statSync, existsSync } = require('fs');
const { yup, importDefault } = require('@strapi/utils');

const srcSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction(),
    register: yup.mixed().isFunction(),
    destroy: yup.mixed().isFunction(),
  })
  .noUnknown();

const validateSrcIndex = (srcIndex) => {
  return srcSchema.validateSync(srcIndex, { strict: true, abortEarly: false });
};

module.exports = (strapi) => {
  if (!existsSync(strapi.dirs.dist.src)) {
    return;
  }

  const pathToSrcIndex = resolve(strapi.dirs.dist.src, 'index.js');
  if (!existsSync(pathToSrcIndex) || statSync(pathToSrcIndex).isDirectory()) {
    return {};
  }

  const srcIndex = importDefault(pathToSrcIndex);

  try {
    validateSrcIndex(srcIndex);
  } catch (e) {
    strapi.stopWithError({ message: `Invalid file \`./src/index.js\`: ${e.message}` });
  }

  return srcIndex;
};
