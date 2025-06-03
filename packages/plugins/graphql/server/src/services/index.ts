import contentAPI from './content-api';
import typeRegistry from './type-registry';
import utils from './utils';
import constants from './constants';
import internals from './internals';
import builders from './builders';
import extension from './extension';
import format from './format';

export const services = {
  builders,
  'content-api': contentAPI,
  constants,
  extension,
  format,
  internals,
  'type-registry': typeRegistry,
  utils,
};
