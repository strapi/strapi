import * as contentTypes from './content-types';
import * as components from './components';
import * as componentCategories from './component-categories';
import * as builder from './builder';
import * as apiHandler from './api-handler';

const exportObject = {
  'content-types': contentTypes,
  components,
  'component-categories': componentCategories,
  builder,
  'api-handler': apiHandler,
};

export default exportObject;
