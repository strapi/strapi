import builder from './builder';
import componentCategories from './component-categories';
import components from './components';
import contentTypes from './content-types';

// to prevent breaking changes, we need to keep the hyphenated names for now
// TODO V5: remove the hyphenated names and export directly
const exportObject = {
  builder,
  'component-categories': componentCategories,
  components,
  'content-types': contentTypes,
};

export default exportObject;
