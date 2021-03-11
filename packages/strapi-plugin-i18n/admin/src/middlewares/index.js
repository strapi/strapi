import extendCMEditViewLayoutMiddleware from './extendCMEditViewLayoutMiddleware';
import extendCTBInitialDataMiddleware from './extendCTBInitialDataMiddleware';
import extendCTBAttributeInitialDataMiddleware from './extendCTBAttributeInitialDataMiddleware';
import localeQueryParamsMiddleware from './localeQueryParamsMiddleware';
import localePermissionMiddleware from './localePermissionMiddleware';

const middlewares = [
  extendCMEditViewLayoutMiddleware,
  extendCTBInitialDataMiddleware,
  extendCTBAttributeInitialDataMiddleware,
  localeQueryParamsMiddleware,
  localePermissionMiddleware,
];

export default middlewares;
