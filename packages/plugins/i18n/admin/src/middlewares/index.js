import addCommonFieldsToInitialDataMiddleware from './addCommonFieldsToInitialDataMiddleware';
import extendCMEditViewLayoutMiddleware from './extendCMEditViewLayoutMiddleware';
import extendCTBInitialDataMiddleware from './extendCTBInitialDataMiddleware';
import extendCTBAttributeInitialDataMiddleware from './extendCTBAttributeInitialDataMiddleware';
import localePermissionMiddleware from './localePermissionMiddleware';

const middlewares = [
  addCommonFieldsToInitialDataMiddleware,
  extendCMEditViewLayoutMiddleware,
  extendCTBInitialDataMiddleware,
  extendCTBAttributeInitialDataMiddleware,
  localePermissionMiddleware,
];

export default middlewares;
