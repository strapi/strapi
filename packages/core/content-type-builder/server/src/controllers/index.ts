import builder from './builder';
import componentCategories from './component-categories';
import components from './components';
import contentTypes from './content-types';
import schema from './schema';

const exportObject = {
  builder,
  'component-categories': componentCategories,
  components,
  'content-types': contentTypes,
  schema,
};

export default exportObject;
