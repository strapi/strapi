'use strict';

/**
 * @typedef {import('types').Strapi} Strapi
 */

const { resolve } = require('path');
const { statSync, existsSync } = require('fs');
const { yup } = require('@strapi/utils');

const srcSchema = yup
  .object()
  .shape({
    // @ts-ignore
    bootstrap: yup.mixed().isFunction(),
    // @ts-ignore
    register: yup.mixed().isFunction(),
    // @ts-ignore
    destroy: yup.mixed().isFunction(),
  })
  .noUnknown();

/**
 * @param {any} srcIndex
 * @returns
 */
const validateSrcIndex = srcIndex => {
  return srcSchema.validateSync(srcIndex, { strict: true, abortEarly: false });
};

/**
 * @param {Strapi} strapi
 * @returns {{
 *   bootstrap?: () => void,
 *   register?: () => void,
 *   destroy?: () => void,
 * }}
 */
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
  } catch (/** @type {any} **/ e) {
    strapi.stopWithError(e, 'Invalid file `./src/index.js`');
  }

  return srcIndex;
};
