import addCommonFieldsToInitialDataMiddleware from './addCommonFieldsToInitialDataMiddleware';
import addLocaleToCollectionTypesMiddleware from './addLocaleToCollectionTypesMiddleware';
import addLocaleToSingleTypesMiddleware from './addLocaleToSingleTypesMiddleware';
import extendCMEditViewLayoutMiddleware from './extendCMEditViewLayoutMiddleware';
import extendCTBInitialDataMiddleware from './extendCTBInitialDataMiddleware';
import extendCTBAttributeInitialDataMiddleware from './extendCTBAttributeInitialDataMiddleware';
import addLocaleColumnToListViewMiddleware from './addLocaleColumnToListViewMiddleware';
import localePermissionMiddleware from './localePermissionMiddleware';

const middlewares = [
  addCommonFieldsToInitialDataMiddleware,
  addLocaleToCollectionTypesMiddleware,
  addLocaleToSingleTypesMiddleware,
  extendCMEditViewLayoutMiddleware,
  extendCTBInitialDataMiddleware,
  extendCTBAttributeInitialDataMiddleware,
  addLocaleColumnToListViewMiddleware,
  localePermissionMiddleware,
];

export default middlewares;
