import addCommonFieldsToInitialDataMiddleware from './addCommonFieldsToInitialDataMiddleware';
import addLocaleToSingleTypesMiddleware from './addLocaleToSingleTypesMiddleware';
import extendCMEditViewLayoutMiddleware from './extendCMEditViewLayoutMiddleware';
import extendCTBInitialDataMiddleware from './extendCTBInitialDataMiddleware';
import extendCTBAttributeInitialDataMiddleware from './extendCTBAttributeInitialDataMiddleware';
import localeQueryParamsMiddleware from './localeQueryParamsMiddleware';
import localePermissionMiddleware from './localePermissionMiddleware';

const middlewares = [
  addCommonFieldsToInitialDataMiddleware,
  addLocaleToSingleTypesMiddleware,
  extendCMEditViewLayoutMiddleware,
  extendCTBInitialDataMiddleware,
  extendCTBAttributeInitialDataMiddleware,
  localeQueryParamsMiddleware,
  localePermissionMiddleware,
];

export default middlewares;
