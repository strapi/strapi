import { resolve } from 'path';
import { statSync, existsSync } from 'fs';
import { yup, importDefault } from '@strapi/utils';

import type { Core } from '@strapi/types';

const srcSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction(),
    register: yup.mixed().isFunction(),
    destroy: yup.mixed().isFunction(),
  })
  .noUnknown();

const validateSrcIndex = (srcIndex: unknown) => {
  return srcSchema.validateSync(srcIndex, { strict: true, abortEarly: false });
};

export default (strapi: Core.Strapi) => {
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
    if (e instanceof yup.ValidationError) {
      strapi.stopWithError({ message: `Invalid file \`./src/index.js\`: ${e.message}` });
    }

    throw e;
  }

  strapi.app = srcIndex;
};
