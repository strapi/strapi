'use strict';

const { resolve } = require('path');
const { statSync, existsSync } = require('fs');
const { yup } = require('@strapi/utils');
const jiti = require('jiti')(__dirname);

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

  for (const ext of ['.js', '.ts', '.mjs', '.cjs']) {
    const file = `index${ext}`;
    const pathToSrcIndex = resolve(strapi.dirs.src, file);
    if (!existsSync(pathToSrcIndex) || statSync(pathToSrcIndex).isDirectory()) {
      continue;
    }

    let srcIndex;
    switch (ext) {
      case '.js':
      case '.cjs':
        srcIndex = require(pathToSrcIndex);
        break;
      case '.mjs':
      case '.ts':
        try {
          const esModule = jiti(pathToSrcIndex);

          if (!esModule || !esModule.default) {
            throw new Error(`The file has no default export`);
          }

          srcIndex = esModule.default;
        } catch (error) {
          throw new Error(`Could not load es/ts module index ${pathToSrcIndex}: ${error.message}`);
        }
        break;
    }

    try {
      validateSrcIndex(srcIndex);
    } catch (e) {
      strapi.stopWithError({ message: `Invalid file \`./src/index.js\`: ${e.message}` });
    }

    return srcIndex;
  }
  return {};
};
