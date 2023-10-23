import addCommonFieldsToInitialDataMiddleware from './addCommonFieldsToInitialDataMiddleware';
import extendCTBAttributeInitialDataMiddleware from './extendCTBAttributeInitialDataMiddleware';
import extendCTBInitialDataMiddleware from './extendCTBInitialDataMiddleware';
import localePermissionMiddleware from './localePermissionMiddleware';

const middlewares = [
  addCommonFieldsToInitialDataMiddleware,
  extendCTBInitialDataMiddleware,
  extendCTBAttributeInitialDataMiddleware,
  localePermissionMiddleware,
];

export default middlewares;
