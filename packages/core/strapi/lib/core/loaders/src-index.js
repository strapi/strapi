'use strict';

const { resolve } = require('path');
const { statSync, existsSync } = require('fs');
const { yup } = require('@strapi/utils');

const srcSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction(),
    register: yup.mixed().isFunction(),
    destroy: yup.mixed().isFunction(),
  })
  .noUnknown();

const validateSrcIndex = srcIndex => {
  return srcSchema.validateSync(srcIndex, { strict: true, abortEarly: false });
};

module.exports = strapi => {
  if (!existsSync(strapi.dirs.src)) {
    throw new Error('Missing src folder. Please create one at `./src`');
  }

  const pathToSrcIndex = resolve(strapi.dirs.src, 'index.js');
  if (!existsSync(pathToSrcIndex) || statSync(pathToSrcIndex).isDirectory()) {
    return {};
  }

  const srcIndex = require(pathToSrcIndex);

  try {
    validateSrcIndex(srcIndex);
  } catch (e) {
    strapi.stopWithError({ message: `Invalid file \`./src/index.js\`: ${e.message}` });
  }

  return srcIndex;
};
