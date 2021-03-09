import extendCTBInitialDataMiddleware from './extendCTBInitialDataMiddleware';
import extendCTBAttributeInitialDataMiddleware from './extendCTBAttributeInitialDataMiddleware';
import localeQueryParamsMiddleware from './localeQueryParamsMiddleware';

const middlewares = [
  extendCTBInitialDataMiddleware,
  extendCTBAttributeInitialDataMiddleware,
  localeQueryParamsMiddleware,
];

export default middlewares;
