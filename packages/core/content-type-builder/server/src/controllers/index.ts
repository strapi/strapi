import builder from './builder';
import componentCategories from './component-categories';
import architect from './architect';
import components from './components';
import contentTypes from './content-types';

const exportObject = {
  architect,
  builder,
  'component-categories': componentCategories,
  components,
  'content-types': contentTypes,
};

export default exportObject;
