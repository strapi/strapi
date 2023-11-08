/* eslint-disable no-multi-assign */
/* eslint-disable node/exports-style */
/* eslint-disable import/no-import-module-exports */
import strapiFactory from './Strapi';

export type * from '@strapi/types';

export type { StrapiCommand, CLIContext } from './commands/types';

export * as factories from './factories';

export default strapiFactory;

// TODO: drop in v5 – see https://github.com/rollup/rollup/issues/1961 for more info on this decision
module.exports = exports = strapiFactory;
