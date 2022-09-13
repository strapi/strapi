import addCommonFieldsToInitialDataMiddleware from './addCommonFieldsToInitialDataMiddleware';
import extendCTBInitialDataMiddleware from './extendCTBInitialDataMiddleware';
import extendCTBAttributeInitialDataMiddleware from './extendCTBAttributeInitialDataMiddleware';
import localePermissionMiddleware from './localePermissionMiddleware';

const middlewares = [
  addCommonFieldsToInitialDataMiddleware,
  extendCTBInitialDataMiddleware,
  extendCTBAttributeInitialDataMiddleware,
  localePermissionMiddleware,
];

export default middlewares;
